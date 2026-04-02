<template>
  <div
    :class="[
      'soft-float rounded-2xl bg-white text-slate-900',
      $attrs.class
    ]"
  >
    <slot />
  </div>
</template>
