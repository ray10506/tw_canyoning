<template>
  <div class="app-layout">
    <CanyonList
      :canyons="filteredCanyons"
      :selected-id="selectedId"
      :selected-difficulty="selectedDifficulty"
      :selected-type="selectedType"
      @select="selectedId = $event"
      @filter="onFilter"
      @filter-type="onFilterType"
      @search="onSearch"
    />
    <Map
      :canyons="filteredCanyons"
      :selected-id="selectedId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Map from './components/Map.vue'
import CanyonList from './components/CanyonList.vue'
import { canyons } from './data/canyon'
import type { RouteType } from './data/canyon'

const selectedDifficulty = ref<number | null>(null)
const selectedType = ref<RouteType | null>(null)
const selectedId = ref<number | null>(null)
const searchQuery = ref('')

const filteredCanyons = computed(() => {
  return canyons.filter(c => {
    const matchType = selectedType.value === null || c.type === selectedType.value
    const matchDifficulty = selectedDifficulty.value === null || c.difficulty === selectedDifficulty.value
    const q = searchQuery.value.trim().toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q)
    return matchType && matchDifficulty && matchSearch
  })
})

function onFilter(difficulty: number | null) {
  selectedDifficulty.value = difficulty
  selectedId.value = null
}

function onFilterType(type: RouteType | null) {
  selectedType.value = type
  selectedId.value = null
}

function onSearch(query: string) {
  searchQuery.value = query
  selectedId.value = null
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
</style>
