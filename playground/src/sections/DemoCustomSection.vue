<template>
  <DocSection
    id="demo-custom"
    title="自定义渲染"
    description="通过 #form-{field} 和 #cell-{field} 插槽覆盖默认渲染。"
  >
    <TabDemo
      :tabs="[
        {
          title: '用户列表',
          badge: '#form-role  #cell-name',
          description:
            '自定义 form slot（radio-group）和 cell slot（带头像 + 部门 tag）',
        },
        {
          title: '订单列表',
          badge: 'search.transform  操作列',
          description: '金额区间查询（slider + transform）和自定义操作列',
        },
      ]"
    >
      <template #tab-0>
        <ElementProTable
          :request="fetchUserList"
          :columns="userColumns"
          rowKey="id"
          :search="{ defaultCollapsed: false }"
        >
          <template #form-role="{ model, field }">
            <el-radio-group v-model="model[field]" size="small">
              <el-radio-button label="admin">管理员</el-radio-button>
              <el-radio-button label="user">普通用户</el-radio-button>
            </el-radio-group>
          </template>
          <template #form-department="{ model, field }">
            <div class="seg">
              <el-button
                v-for="dept in ['全部', '研发', '产品', '运营', '销售']"
                :key="dept"
                size="small"
                :type="
                  (
                    dept === '全部'
                      ? model[field] === undefined
                      : model[field] === dept
                  )
                    ? 'primary'
                    : 'default'
                "
                @click="model[field] = dept === '全部' ? undefined : dept"
                >{{ dept }}</el-button
              >
            </div>
          </template>
          <template #cell-name="{ record }">
            <div class="cell-name">
              <el-avatar
                :size="28"
                :style="{ background: avatarBg(record.name) }"
                >{{ String(record.name).slice(0, 1) }}</el-avatar
              >
              <div class="cell-name-main">
                <div class="cell-name-title">{{ record.name }}</div>
                <div class="cell-name-sub">
                  ID: {{ record.id }} · {{ record.department }}
                </div>
              </div>
              <el-button link type="primary" @click="copyText(record.name)"
                >复制</el-button
              >
            </div>
          </template>
          <template #cell-department="{ record }">
            <el-tag :type="deptTagType(record.department)" effect="dark">{{
              record.department
            }}</el-tag>
          </template>
          <template #cell-status="{ record }">
            <el-tag
              :type="record.status === 'active' ? 'success' : 'danger'"
              effect="plain"
            >
              {{ record.status === "active" ? "正常" : "停用" }}
            </el-tag>
          </template>
          <template #cell-createdAt="{ record }">
            <el-tooltip :content="String(record.createdAt)" placement="top">
              <span class="mono">{{
                new Date(record.createdAt).toLocaleString()
              }}</span>
            </el-tooltip>
          </template>
        </ElementProTable>
      </template>

      <template #tab-1>
        <ElementProTable
          :request="fetchOrderList"
          :columns="orderShowcaseColumns"
          rowKey="id"
          :search="{ defaultCollapsed: false }"
          :debounceTime="120"
        >
          <template #form-amountRange="{ model, field }">
            <div class="range">
              <el-slider
                v-model="model[field]"
                range
                :min="0"
                :max="900"
                :step="10"
                style="width: 260px"
              />
              <div class="range-text">
                {{
                  Array.isArray(model[field])
                    ? `${model[field][0]} ~ ${model[field][1]}`
                    : "—"
                }}
              </div>
            </div>
          </template>
          <template #form-channel="{ model, field }">
            <el-checkbox-group v-model="model[field]" size="small">
              <el-checkbox-button label="alipay">支付宝</el-checkbox-button>
              <el-checkbox-button label="wechat">微信</el-checkbox-button>
              <el-checkbox-button label="card">银行卡</el-checkbox-button>
            </el-checkbox-group>
          </template>
          <template #cell-orderNo="{ record }">
            <div class="cell-order">
              <span class="mono">{{ record.orderNo }}</span>
              <el-button link type="primary" @click="copyText(record.orderNo)"
                >复制</el-button
              >
            </div>
          </template>
          <template #cell-amount="{ record }">
            <div class="cell-amount">
              <span
                class="mono"
                :class="
                  record.amount >= 600
                    ? 't-hot'
                    : record.amount >= 300
                      ? 't-warm'
                      : 't-cool'
                "
              >
                ￥{{ record.amount.toFixed(2) }}
              </span>
              <el-progress
                :percentage="
                  Math.min(100, Math.round((record.amount / 900) * 100))
                "
                :stroke-width="10"
                :show-text="false"
              />
            </div>
          </template>
          <template #cell-status="{ record }">
            <el-tag :type="orderStatusTagType(record.status)">{{
              orderStatusLabel(record.status)
            }}</el-tag>
          </template>
          <template #cell-actions="{ record }">
            <div class="cell-actions">
              <el-button
                size="small"
                type="primary"
                plain
                @click="openOrder(record.orderNo)"
                >详情</el-button
              >
              <el-button size="small" @click="openOrder(record.orderNo)"
                >退款</el-button
              >
            </div>
          </template>
        </ElementProTable>
      </template>
    </TabDemo>
  </DocSection>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ElMessage } from "element-plus";
import { ElementProTable } from "@vue-protable/element-plus";
import {
  fetchUserList,
  fetchOrderList,
  userColumns,
  orderColumns,
} from "@/mock";
import DocSection from "@/components/DocSection.vue";
import TabDemo from "@/components/TabDemo.vue";

const orderShowcaseColumns = computed(() => {
  const amountRange = {
    title: "金额区间",
    dataIndex: "amountRange",
    hideInTable: true,
    search: {
      transform: (val: any) => {
        if (!Array.isArray(val) || val.length !== 2) return {};
        const [min, max] = val;
        return { amountMin: min, amountMax: max };
      },
    },
  };
  return [
    amountRange as any,
    ...orderColumns,
    { title: "操作", dataIndex: "actions", hideInSearch: true } as any,
  ];
});

const avatarBg = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 45%)`;
};
const deptTagType = (dept: string) =>
  dept === "研发"
    ? "success"
    : dept === "产品"
      ? "warning"
      : dept === "运营"
        ? "info"
        : "danger";
const orderStatusLabel = (s: string) =>
  s === "pending"
    ? "待支付"
    : s === "paid"
      ? "已支付"
      : s === "refund"
        ? "退款中"
        : "已关闭";
const orderStatusTagType = (s: string) =>
  s === "paid"
    ? "success"
    : s === "pending"
      ? "warning"
      : s === "refund"
        ? "info"
        : "danger";
const openOrder = (orderNo: string) => ElMessage.info(`点击了 ${orderNo}`);

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = Object.assign(document.createElement("textarea"), {
      value: text,
      style: "position:fixed;left:-9999px",
    });
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
  ElMessage.success("已复制");
};
</script>

<style scoped>
.mono {
  font-family: "JetBrains Mono", monospace;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}
.seg {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.cell-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
}
.cell-name-main {
  min-width: 0;
  flex: 1;
}
.cell-name-title {
  font-size: 13px;
  line-height: 1.2;
}
.cell-name-sub {
  margin-top: 2px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}
.cell-order {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cell-amount {
  display: grid;
  gap: 5px;
}
.cell-actions {
  display: flex;
  gap: 6px;
}
.range {
  display: flex;
  align-items: center;
  gap: 10px;
}
.range-text {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  min-width: 90px;
}
.t-hot {
  color: #fca5a5;
}
.t-warm {
  color: #fcd34d;
}
.t-cool {
  color: #93c5fd;
}
:global(html:not(.dark)) .t-hot {
  color: #b91c1c;
}
:global(html:not(.dark)) .t-warm {
  color: #b45309;
}
:global(html:not(.dark)) .t-cool {
  color: #1d4ed8;
}
</style>
