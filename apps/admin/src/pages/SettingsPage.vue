<template>
  <section class="grid gap-5 xl:grid-cols-2">
    <article class="rounded-[28px] border border-[color:var(--color-border)] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Runtime</p>
      <h2 class="mt-2 text-xl font-semibold text-slate-900">系统配置</h2>
      <div class="mt-6 space-y-4 text-sm text-slate-600">
        <div class="rounded-2xl bg-slate-50 px-4 py-4">模型路由策略：混合问答 + 推荐增强</div>
        <div class="rounded-2xl bg-slate-50 px-4 py-4">语音播报：默认普通话女声</div>
        <div class="rounded-2xl bg-slate-50 px-4 py-4">会话保留：30 天</div>
      </div>
    </article>

    <article class="rounded-[28px] border border-[color:var(--color-border)] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Permissions</p>
      <h2 class="mt-2 text-xl font-semibold text-slate-900">权限与发布</h2>
      <div class="mt-6 space-y-4 text-sm text-slate-600">
        <div class="rounded-2xl border border-[color:var(--color-border)] px-4 py-4">后台角色：运营、内容、管理员</div>
        <div class="rounded-2xl border border-[color:var(--color-border)] px-4 py-4">灰度发布：支持按景区分批启用</div>
        <div class="rounded-2xl border border-[color:var(--color-border)] px-4 py-4">日志审计：保留最近 90 天变更记录</div>
      </div>
    </article>
  </section>
</template>
