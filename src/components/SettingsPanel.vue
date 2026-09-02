<template>
  <div class="settings-backdrop" @click="$emit('close')" />

  <div class="settings-panel">
    <div class="panel-header">
      <span class="panel-title">{{ locale === 'en' ? 'Settings' : '設定' }}</span>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <!-- Language -->
    <div class="setting-row">
      <span class="setting-label">{{ locale === 'en' ? 'Language' : '語言' }}</span>
      <div class="lang-toggle">
        <button :class="['lang-opt', { active: locale === 'zh' }]" @click="locale = 'zh'">中文</button>
        <button :class="['lang-opt', { active: locale === 'en' }]" @click="locale = 'en'">English</button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { locale } from '../lib/locale'

defineEmits<{ close: [] }>()
</script>

<style scoped>
.settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
}

.settings-panel {
  position: fixed;
  bottom: 84px; /* above bottom bar */
  left: 50%;
  transform: translateX(-50%);
  z-index: 1201;
  width: min(320px, calc(100vw - 32px));
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #6c8ef5;
}

.close-btn {
  background: none;
  border: none;
  color: #555;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.15s;
}
.close-btn:hover { color: #aaa; }

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.setting-label {
  font-size: 0.875rem;
  color: #aaa;
  flex-shrink: 0;
}

.lang-toggle {
  display: flex;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  overflow: hidden;
}

.lang-opt {
  padding: 6px 14px;
  background: transparent;
  border: none;
  color: #666;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}
.lang-opt + .lang-opt { border-left: 1px solid #3a3a5a; }
.lang-opt.active { background: #6c8ef5; color: #fff; font-weight: 600; }
</style>
