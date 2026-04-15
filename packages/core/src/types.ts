import { Ref, ComputedRef } from 'vue';

export type ValueType = 'text' | 'select' | 'date' | 'dateTime' | 'time' | 'digit' | 'progress' | 'money' | 'percent' | 'image' | 'avatar' | string;

export interface ProColumnType<T = any> {
  title: string;
  dataIndex: string;
  valueType?: ValueType;
  
  /** 表单联动机制：声明依赖的字段。当依赖字段改变时，当前列可以重新请求数据或清空值 */
  dependencies?: string[];
  hideInSearch?: boolean;
  search?: false | {
    transform?: (value: any) => any;
  };
  
  /** 搜索表单的默认值 */
  initialValue?: any;
  
  /** 格式化日期，如果 valueType 是 date/dateTime 时默认处理。可以是字符串如 'YYYY-MM-DD'，或 boolean */
  dateFormatter?: string | boolean | ((value: any) => any);

  /** 枚举配置，适用于 select 类型的筛选与表格回显，支持异步请求 */
  valueEnum?: 
    | Record<string, { text: string; status?: string }> 
    | { label: string; value: any }[]
    | ((row?: T, index?: number) => Promise<Record<string, { text: string; status?: string }> | { label: string; value: any }[]>);

  /** 表格列控制配置 */
  hideInTable?: boolean;
  order?: number; // 列的排序权重，越大越靠前
  fixed?: 'left' | 'right' | boolean; // 固定列
  
  /** 单元格编辑配置 */
  editable?: false | ((text: any, record: T, index: number) => boolean);
  
  /** 是否支持排序 */
  sorter?: boolean | 'custom' | ((a: T, b: T) => number);
  
  /** 自定义渲染函数 */
  render?: (text: any, record: T, index: number) => any;
  renderFormItem?: (model: any, field: string) => any;
}

export interface PaginationConfig {
  defaultCurrent?: number;
  defaultPageSize?: number;
  current?: number;
  pageSize?: number;
  total?: number;
}

export interface EditableConfig<T = any> {
  /** 控制可编辑表格行的 key 集合 */
  editableKeys?: (string | number)[];
  /** 发生修改时的回调 */
  onChange?: (editableKeys: (string | number)[], editableRows: T[]) => void;
  /** 保存时的回调 */
  onSave?: (key: string | number, row: T, originRow: T) => Promise<boolean | void>;
  /** 取消时的回调 */
  onCancel?: (key: string | number, row: T, originRow: T) => Promise<boolean | void>;
  /** 删除时的回调 */
  onDelete?: (key: string | number, row: T) => Promise<boolean | void>;
}

export interface SearchConfig {
  /** 表单默认是否折叠 */
  defaultCollapsed?: boolean;
  /** 搜索项栅格占比 (总共 24) */
  span?: number | Record<'xs'|'sm'|'md'|'lg'|'xl'|'xxl', number>;
  /** 提交时的回调，返回被格式化后的参数 */
  transform?: (searchParams: any) => any;
}

export interface UseProTableOptions<T, U = Record<string, any>> {
  request?: (
    params: U & { current: number; pageSize: number },
    sorter: Record<string, 'ascend' | 'descend'>,
    filter: Record<string, (string | number)[]>
  ) => Promise<{ data: T[]; success: boolean; total?: number }>;
  
  params?: Ref<U> | (() => U) | U;
  columns?: ProColumnType<T>[];
  pagination?: boolean | PaginationConfig;
  manual?: boolean;
  
  /** 轮询间隔 (ms)，小于等于 0 或 undefined 表示不轮询 */
  polling?: number;
  
  /** 请求防抖时间 (ms)，默认 10 毫秒 */
  debounceTime?: number;
  
  /** 跨页选中配置 */
  preserveSelectedRowKeys?: boolean;
  
  /** 行选择配置 */
  rowSelection?: {
    selectedRowKeys?: (string | number)[];
    onChange?: (selectedRowKeys: (string | number)[], selectedRows: T[]) => void;
    alwaysShowAlert?: boolean;
  };
  
  /** 搜索表单高级配置 */
  search?: false | SearchConfig;
  
  /** 可编辑表格高级配置 */
  editable?: EditableConfig<T>;

  /** 获取行的唯一标识，默认为 'id' */
  rowKey?: string | ((record: T) => string | number);
  
  /** 日期格式化方法（用于底层支持，如果未提供将尝试内置的简单实现） */
  dateFormatter?: 'string' | 'number' | false;
  
  /** 发起网络请求前的拦截，可以在此修改全部参数 */
  beforeSearchSubmit?: (params: Partial<U>) => any;
  
  /** 数据获取成功后的回调，可以在这里对数据进行最后一次处理 */
  postData?: (data: T[]) => T[];
  
  /** 请求异常的回调 */
  onRequestError?: (e: Error) => void;
}

export interface StandardInputProps {
  value: any;
  onChange: (val: any) => void;
}

export interface StandardPaginationProps {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
}

export interface StandardTableProps<T = any> {
  dataSource: T[];
  columns: ProColumnType<T>[];
  loading: boolean;
}

export interface UIAdapterRegistry {
  Table: any | { component: any; mapProps?: (props: StandardTableProps) => any; mapEvents?: (emit: any) => any };
  Form: any | { component: any; mapProps?: (props: any) => any };
  FormItem: any | { component: any; mapProps?: (props: any) => any };
  Pagination: any | { component: any; mapProps?: (props: StandardPaginationProps) => any; mapEvents?: (emit: any) => any };
  
  // Field Components
  Input?: any | { component: any; mapProps?: (props: StandardInputProps) => any };
  Select?: any | { component: any; mapProps?: (props: StandardInputProps & { options?: any }) => any };
  DatePicker?: any | { component: any; mapProps?: (props: StandardInputProps) => any };
  
  [key: string]: any;
}
