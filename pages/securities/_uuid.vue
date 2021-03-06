<template>
  <v-row align="center" justify="center">
    <v-col cols="12" sm="8" md="6">
      <div class="headline">
        {{ security.name }}
        <v-btn
          v-if="$auth.loggedIn"
          color="primary"
          icon
          text
          @click="editSecurity(security)"
        >
          <v-icon>{{ mdiPencil }}</v-icon>
        </v-btn>
      </div>

      <v-tooltip right>
        <template #activator="{ on }">
          <v-btn
            color="primary"
            max-width="400"
            nuxt
            :to="$route.path"
            class="mt-2"
            style="cursor: move"
            v-on="on"
          >
            <v-icon>{{ mdiDragVariant }}</v-icon> Add to Portfolio Performance
          </v-btn>
        </template>
        <div>
          <div class="title">Drag and drop!</div>
          To add this security in Portfolio<br />
          Performance, drag and drop it to<br />
          securities list or statement of assets.
        </div>
      </v-tooltip>

      <v-tabs grow>
        <v-tab key="overview">Overview</v-tab>
        <v-tab key="prices">Prices</v-tab>
        <v-tab key="events">Events</v-tab>

        <v-tab-item key="overview">
          <ul>
            <li v-if="$auth.loggedIn">
              UUID: <b>{{ security.uuid }}</b>
            </li>
            <li>
              ISIN: <b>{{ security.isin }}</b>
            </li>
            <li>
              WKN: <b>{{ security.wkn }}</b>
            </li>
            <li v-for="market in markets" :key="market.marketCode">
              Market: <b>{{ market.name }}</b>
              <ul>
                <li>
                  Currency: <b>{{ market.currencyCode || '-' }}</b>
                </li>
                <li>
                  Symbol: <b>{{ market.symbol }}</b>
                </li>
                <li>
                  Prices available: <b>{{ market.firstPriceDate }}</b> -
                  <b>{{ market.lastPriceDate }}</b>
                </li>
              </ul>
            </li>
            <li v-if="security.symbolXfra">
              Symbol (Frankfurt):
              <b>{{ security.symbolXfra }}</b>
            </li>
            <li v-if="security.symbolXnas">
              Symbol (NASDAQ):
              <b>{{ security.symbolXnas }}</b>
            </li>
            <li v-if="security.symbolXnys">
              Symbol (New York):
              <b>{{ security.symbolXnys }}</b>
            </li>
            <li>
              Type:
              <v-chip small color="primary" text-color="white">
                {{ security.securityType }}
              </v-chip>
            </li>
          </ul>
        </v-tab-item>

        <v-tab-item key="prices">
          <v-select
            v-model="selectedMarketcode"
            label="Market"
            :items="markets"
            item-value="marketCode"
          >
            <template slot="selection" slot-scope="{ item }">
              {{ item.name }} - {{ item.marketCode }}
            </template>
            <template slot="item" slot-scope="{ item }">
              {{ item.name }} - {{ item.marketCode }}
            </template>
          </v-select>

          <div v-if="selectedMarket">
            <ul>
              <li>
                Symbol: <b>{{ selectedMarket.symbol }}</b>
              </li>
              <li>
                Currency: <b>{{ selectedMarket.currencyCode || '-' }}</b>
              </li>
              <li>
                Prices available: <b>{{ selectedMarket.firstPriceDate }}</b> -
                <b>{{ selectedMarket.lastPriceDate }}</b>
              </li>
            </ul>

            <prices-table :prices="selectedMarket.prices" />
          </div>
        </v-tab-item>

        <v-tab-item key="events">
          <v-simple-table>
            <template #default>
              <thead>
                <tr>
                  <th class="text-left">Date</th>
                  <th class="text-left">Type</th>
                  <th class="text-left">...</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="event in security.events"
                  :key="event.date + event.type"
                >
                  <td>{{ event.date }}</td>
                  <td style="text-transform: capitalize">{{ event.type }}</td>
                  <td>
                    {{
                      event.type === 'dividend'
                        ? event.amount + ' ' + event.currencyCode
                        : ''
                    }}
                    {{ event.type === 'split' ? event.ratio : '' }}
                  </td>
                </tr>
                <tr v-if="security.events.length === 0">
                  <td colspan="3">No events available</td>
                </tr>
              </tbody>
            </template>
          </v-simple-table>
        </v-tab-item>
      </v-tabs>

      <v-tabs-items> </v-tabs-items>

      <SecurityDialog ref="securityDialog" />
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { Component, Vue, Watch, mixins } from 'nuxt-property-decorator'

import { IconsMixin } from '@/components/icons-mixin'
import PricesTable from '@/components/prices-table.vue'
import SecurityDialog from '@/components/security-dialog.vue'

@Component({
  async asyncData({ $axios, params, error }): Promise<any> {
    try {
      const security = await $axios.$get(`/securities/uuid/${params.uuid}`)
      return { security }
    } catch (err) {
      error({ statusCode: 404, message: 'This page could not be found' })
    }
  },

  components: { PricesTable, SecurityDialog },
})
export default class SecurityPage extends mixins(Vue, IconsMixin) {
  // asyncData
  security: any

  $refs!: {
    securityDialog: SecurityDialog
  }

  selectedMarketcode: string = ''
  selectedMarket: any = null

  @Watch('selectedMarketcode')
  async onSelectedMarketcodeChange() {
    this.selectedMarket = await this.$axios.$get(
      `/securities/uuid/${this.$route.params.uuid}/markets/${this.selectedMarketcode}`,
      { params: { from: '2000-01-01' } }
    )
  }

  head() {
    return {
      title: this.security.name + ' - Portfolio Report',
    }
  }

  get markets() {
    return this.security.markets.map((market: any) => {
      let marketName
      if (market.marketCode === 'XETR') {
        marketName = 'XETRA (Frankfurt)'
      } else if (market.marketCode === 'XFRA') {
        marketName = 'Frankfurt'
      } else if (market.marketCode === 'XNAS') {
        marketName = 'NASDAQ'
      } else if (market.marketCode === 'XNYS') {
        marketName = 'NYSE'
      }
      return {
        ...market,
        name: marketName,
      }
    })
  }

  async editSecurity(security: any) {
    const ret = await this.$refs.securityDialog.edit(security)
    if (ret) {
      this.security = { ...this.security, ...ret }
    }
  }
}
</script>
