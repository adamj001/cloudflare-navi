// src/api/http.ts
// 不使用外部JWT库，改为内置的crypto API
import { compareSync } from 'bcrypt-edge';

// 定义D1数据库类型
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1Result>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: unknown;
}

// 定义环境变量接口
interface Env {
  DB: D1Database;
  AUTH_ENABLED?: string; // 是否启用身份验证
  AUTH_USERNAME?: string; // 认证用户名
  AUTH_PASSWORD?: string; // 认证密码哈希 (bcrypt)
  AUTH_SECRET?: string; // JWT密钥
}

// 数据类型定义
export interface Group {
  id?: number;
  name: string;
  order_num: number;
  parent_id?: number | null; // ✨ 新增：支持真正的子菜单关联
  is_public?: number; // 0 = 私密（仅管理员可见），1 = 公开（访客可见）
  created_at?: string;
  updated_at?: string;
}

export interface Site {
  id?: number;
  group_id: number;
  name: string;
  url: string;
  icon: string;
  description: string;
  notes: string;
  order_num: number;
  is_public?: number; // 0 = 私密（仅管理员可见），1 = 公开（访客可见）
  created_at?: string;
  updated_at?: string;
}

// 分组及其站点 (包含子菜单的树状结构)
export interface GroupTreeNode extends Group {
  id: number;
  sites: Site[];
  sub_menus: GroupTreeNode[]; // ✨ 新增：用于存放子菜单
}

// 保留旧版本的兼容接口，方便重构过渡
export interface GroupWithSites extends Group {
  id: number; 
  sites: Site[];
}

// 新增配置接口
export interface Config {
  key: string;
  value: string;
  created_at?: string;
  updated_at?: string;
}

// 扩展导出数据接口，添加导入结果类型
export interface ExportData {
  groups: Group[];
  sites: Site[];
  configs: Record<string, string>;
  version: string;
  exportDate: string;
}

interface LegacyBackupMenu {
  id?: number;
  name?: string;
  order_num?: number;
  is_public?: number;
  created_at?: string;
  updated_at?: string;
  cards?: LegacyBackupCard[];
  sub_menus?: LegacyBackupSubMenu[];
  subMenus?: LegacyBackupSubMenu[];
}

interface LegacyBackupSubMenu {
  id?: number;
  menu_id?: number;
  name?: string;
  title?: string;
  order_num?: number;
  order?: number;
  is_public?: number;
  cards?: LegacyBackupCard[];
}

interface LegacyBackupCard {
  id?: number;
  menu_id?: number;
  sub_menu_id?: number | null;
  title?: string;
  name?: string;
  url?: string;
  logo_url?: string | null;
  custom_logo_path?: string | null;
  icon?: string | null;
  desc?: string | null;
  description?: string | null;
  notes?: string | null;
  order?: number;
  order_num?: number;
  is_public?: number;
  created_at?: string;
  updated_at?: string;
}

interface LegacyBackupData {
  version?: string;
  date?: string;
  menus?: LegacyBackupMenu[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isCurrentExportData(data: unknown): data is ExportData {
  return (
    isRecord(data) &&
    Array.isArray(data.groups) &&
    Array.isArray(data.sites) &&
    isRecord(data.configs)
  );
}

function toInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toPublicFlag(value: unknown): number {
  return value === 0 ? 0 : 1;
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function pickIcon(card: LegacyBackupCard): string {
  return toText(card.custom_logo_path || card.logo_url || card.icon);
}

function normalizeUrl(url: unknown): string {
  const value = toText(url).trim();
  if (!value) {
    return '';
  }
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function convertLegacyBackup(data: LegacyBackupData): ExportData {
  const groups: Group[] = [];
  const sites: Site[] = [];
  const menus = Array.isArray(data.menus) ? data.menus : [];
  let syntheticGroupId = 1;

  for (const [menuIndex, menu] of menus.entries()) {
    const menuId = toInt(menu.id, syntheticGroupId++);
    const menuName = toText(menu.name).trim();
    if (!menuName) {
      continue;
    }

    groups.push({
      id: menuId,
      name: menuName,
      order_num: toInt(menu.order_num, menuIndex),
      parent_id: null, // 顶级菜单
      is_public: toPublicFlag(menu.is_public),
      created_at: menu.created_at,
      updated_at: menu.updated_at,
    });

    const addCards = (cards: LegacyBackupCard[] | undefined, groupId: number, groupName?: string) => {
      if (!Array.isArray(cards)) {
        return;
      }

      for (const [cardIndex, card] of cards.entries()) {
        const name = toText(card.title || card.name).trim();
        const url = normalizeUrl(card.url);

        if (!name || !url) {
          continue;
        }

        sites.push({
          id: card.id,
          group_id: groupId,
          name,
          url,
          icon: pickIcon(card),
          description: toText(card.desc || card.description),
          notes: toText(card.notes || groupName),
          order_num: toInt(card.order_num ?? card.order, cardIndex),
          is_public: toPublicFlag(card.is_public ?? menu.is_public),
          created_at: card.created_at,
          updated_at: card.updated_at,
        });
      }
    };

    addCards(
      Array.isArray(menu.cards)
        ? menu.cards.filter((card) => card.sub_menu_id === null || card.sub_menu_id === undefined)
        : undefined,
      menuId
    );

    const subMenuMap = new Map<number | string, LegacyBackupSubMenu>();
    const rawSubMenus = [
      ...(Array.isArray(menu.sub_menus) ? menu.sub_menus : []),
      ...(Array.isArray(menu.subMenus) ? menu.subMenus : []),
    ];

    for (const [rawIndex, subMenu] of rawSubMenus.entries()) {
      const key = subMenu.id ?? `${toText(subMenu.name || subMenu.title)}-${rawIndex}`;
      const existing = subMenuMap.get(key);
      if (!existing || (!existing.cards?.length && subMenu.cards?.length)) {
        subMenuMap.set(key, subMenu);
      }
    }

    const subMenus = Array.from(subMenuMap.values());

    for (const [subIndex, subMenu] of subMenus.entries()) {
      const subName = toText(subMenu.name || subMenu.title).trim();
      const subGroupId = toInt(subMenu.id, syntheticGroupId++);

      if (subName) {
        groups.push({
          id: subGroupId,
          name: subName, // 保持干净的名字，依赖 parent_id 关联
          order_num: toInt(subMenu.order_num ?? subMenu.order, groups.length + subIndex),
          parent_id: menuId, // ✨ 这里改成真正的父子 ID 绑定
          is_public: toPublicFlag(subMenu.is_public ?? menu.is_public),
        });
      }

      const nestedCards =
        Array.isArray(subMenu.cards) && subMenu.cards.length > 0
          ? subMenu.cards
          : Array.isArray(menu.cards)
            ? menu.cards.filter((card) => card.sub_menu_id === subMenu.id)
            : [];

      addCards(nestedCards, subName ? subGroupId : menuId, subName);
    }
  }

  return {
    groups,
    sites,
    configs: {},
    version: data.version || 'legacy-2.0',
    exportDate: data.date || new Date().toISOString(),
  };
}

export function normalizeImportData(data: unknown): ExportData {
  if (isCurrentExportData(data)) {
    return {
      groups: data.groups,
      sites: data.sites,
      configs: data.configs,
      version: data.version,
      exportDate: data.exportDate,
    };
  }

  if (isRecord(data) && Array.isArray(data.menus)) {
    return convertLegacyBackup(data as LegacyBackupData);
  }

  throw new Error('Unsupported import data format');
}

// 导入结果接口
export interface ImportResult {
  success: boolean;
  stats?: {
    groups: {
      total: number;
      created: number;
      merged: number;
    };
    sites: {
      total: number;
      created: number;
      updated: number;
      skipped: number;
    };
  };
  error?: string;
}

// 新增用户登录接口
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean; 
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

// API 类
export class NavigationAPI {
  private db: D1Database;
  private authEnabled: boolean;
  private username: string;
  private passwordHash: string; 
  private secret: string;

  constructor(env: Env) {
    this.db = env.DB;
    this.authEnabled = env.AUTH_ENABLED === 'true';
    this.username = env.AUTH_USERNAME || '';
    this.passwordHash = env.AUTH_PASSWORD || ''; 
    this.secret = env.AUTH_SECRET || 'DefaultSecretKey';
  }

  // 初始化数据库表
  async initDB(): Promise<{ success: boolean; alreadyInitialized: boolean }> {
    try {
      const isInitialized = await this.getConfig('DB_INITIALIZED');
      if (isInitialized === 'true') {
        return { success: true, alreadyInitialized: true };
      }
    } catch {
      // 继续初始化
    }

    // ✨ 修改：groups 表增加 parent_id 建立父子菜单外键关系
    await this.db.exec(
      `CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        name TEXT NOT NULL, 
        order_num INTEGER NOT NULL, 
        parent_id INTEGER DEFAULT NULL,
        is_public INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES groups(id) ON DELETE CASCADE
      );`
    );

    // 创建sites表
    await this.db.exec(
      `CREATE TABLE IF NOT EXISTS sites (id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL, icon TEXT, description TEXT, notes TEXT, order_num INTEGER NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE);`
    );

    // 创建全局配置表
    await this.db.exec(`CREATE TABLE IF NOT EXISTS configs (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);

    // 设置初始化标志
    await this.setConfig('DB_INITIALIZED', 'true');

    return { success: true, alreadyInitialized: false };
  }

  // 验证用户登录
  async login(loginRequest: LoginRequest): Promise<LoginResponse> {
    if (!this.authEnabled) {
      return {
        success: true,
        token: await this.generateToken({ username: 'guest' }, false),
        message: '身份验证未启用，默认登录成功',
      };
    }

    if (loginRequest.username !== this.username) {
      return {
        success: false,
        message: '用户名或密码错误',
      };
    }

    const isPasswordValid = compareSync(loginRequest.password, this.passwordHash);

    if (isPasswordValid) {
      const token = await this.generateToken(
        { username: loginRequest.username },
        loginRequest.rememberMe || false
      );
      return {
        success: true,
        token,
        message: '登录成功',
      };
    }

    return {
      success: false,
      message: '用户名或密码错误',
    };
  }

  // 验证令牌有效性
  async verifyToken(token: string): Promise<{ valid: boolean; payload?: Record<string, unknown> }> {
    if (!this.authEnabled) {
      return { valid: true };
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false };
      }

      const [encodedHeader, encodedPayload, signature] = parts;

      if (!encodedHeader || !encodedPayload || !signature) {
        return { valid: false };
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
      const keyData = encoder.encode(this.secret);

      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      const signatureBytes = this.base64UrlDecode(signature);
      const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, data);

      if (!isValid) {
        return { valid: false };
      }

      const payloadStr = atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadStr) as Record<string, unknown>;

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && typeof payload.exp === 'number' && payload.exp < now) {
        return { valid: false };
      }

      return { valid: true, payload };
    } catch (error) {
      console.error('Token验证失败:', error);
      return { valid: false };
    }
  }

  // 生成JWT令牌
  private async generateToken(
    payload: Record<string, unknown>,
    rememberMe: boolean = false
  ): Promise<string> {
    const expiresIn = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

    const tokenPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
      iat: Math.floor(Date.now() / 1000),
    };

    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(tokenPayload));

    const encoder = new TextEncoder();
    const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
    const keyData = encoder.encode(this.secret);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
    const signature = this.base64UrlEncode(signatureBuffer);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private base64UrlEncode(data: string | ArrayBuffer): string {
    let base64: string;
    if (typeof data === 'string') {
      base64 = btoa(data);
    } else {
      const bytes = new Uint8Array(data);
      const binary = Array.from(bytes)
        .map((byte) => String.fromCharCode(byte))
        .join('');
      base64 = btoa(binary);
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private base64UrlDecode(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  isAuthEnabled(): boolean {
    return this.authEnabled;
  }

  // 分组相关 API
  async getGroups(): Promise<Group[]> {
    const result = await this.db
      .prepare('SELECT id, name, order_num, parent_id, is_public, created_at, updated_at FROM groups ORDER BY order_num')
      .all<Group>();
    return result.results || [];
  }

  async getGroup(id: number): Promise<Group | null> {
    const result = await this.db
      .prepare('SELECT id, name, order_num, parent_id, is_public, created_at, updated_at FROM groups WHERE id = ?')
      .bind(id)
      .first<Group>();
    return result;
  }

  async createGroup(group: Group): Promise<Group> {
    const result = await this.db
      .prepare(
        'INSERT INTO groups (name, order_num, parent_id, is_public) VALUES (?, ?, ?, ?) RETURNING id, name, order_num, parent_id, is_public, created_at, updated_at'
      )
      .bind(group.name, group.order_num, group.parent_id ?? null, group.is_public ?? 1)
      .all<Group>();
    if (!result.results || result.results.length === 0) {
      throw new Error('创建分组失败');
    }
    const createdGroup = result.results[0];
    if (!createdGroup) {
      throw new Error('创建分组失败');
    }
    return createdGroup;
  }

  async updateGroup(id: number, group: Partial<Group>): Promise<Group | null> {
    // ✨ 修改：白名单中加入 'parent_id' 允许更新层级
    const ALLOWED_FIELDS = ['name', 'order_num', 'is_public', 'parent_id'] as const;
    type AllowedField = (typeof ALLOWED_FIELDS)[number];

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: (string | number | null)[] = []; // 类型改为允许 null

    // 只允许更新白名单中的字段
    Object.entries(group).forEach(([key, value]) => {
      if (ALLOWED_FIELDS.includes(key as AllowedField) && value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value as string | number | null); // ✨ 强转断言，彻底解决先前的 TS2345 编译报错
      } else if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        console.warn(`尝试更新不允许的字段: ${key}`);
      }
    });

    if (updates.length === 1) {
      throw new Error('没有可更新的字段');
    }

    const query = `UPDATE groups SET ${updates.join(
      ', '
    )} WHERE id = ? RETURNING id, name, order_num, parent_id, is_public, created_at, updated_at`;
    params.push(id);

    const result = await this.db
      .prepare(query)
      .bind(...params)
      .all<Group>();

    if (!result.results || result.results.length === 0) {
      return null;
    }
    return result.results[0] || null;
  }

  async deleteGroup(id: number): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM groups WHERE id = ?').bind(id).run();
    return result.success;
  }

  // 网站相关 API
  async getSites(groupId?: number): Promise<Site[]> {
    let query =
      'SELECT id, group_id, name, url, icon, description, notes, order_num, is_public, created_at, updated_at FROM sites';
    const params: (string | number)[] = [];

    if (groupId !== undefined) {
      query += ' WHERE group_id = ?';
      params.push(groupId);
    }

    query += ' ORDER BY order_num';

    const result = await this.db
      .prepare(query)
      .bind(...params)
      .all<Site>();
    return result.results || [];
  }

  /**
   * ✨ 核心重构：获取所有分组及其站点并构建树状图
   * 支持真正的无限/多层嵌套子菜单，无缝契合前端 UI
   */
  async getGroupsWithSites(): Promise<GroupTreeNode[]> {
    const query = `
      SELECT
        g.id as group_id,
        g.name as group_name,
        g.order_num as group_order,
        g.parent_id as group_parent_id,
        g.is_public as group_is_public,
        g.created_at as group_created_at,
        g.updated_at as group_updated_at,
        s.id as site_id,
        s.name as site_name,
        s.url as site_url,
        s.icon as site_icon,
        s.description as site_description,
        s.notes as site_notes,
        s.order_num as site_order,
        s.is_public as site_is_public,
        s.created_at as site_created_at,
        s.updated_at as site_updated_at
      FROM groups g
      LEFT JOIN sites s ON g.id = s.group_id
      ORDER BY g.order_num ASC, s.order_num ASC
    `;

    const result = await this.db.prepare(query).all<{
      group_id: number;
      group_name: string;
      group_order: number;
      group_parent_id: number | null;
      group_is_public?: number;
      group_created_at: string;
      group_updated_at: string;
      site_id: number | null;
      site_name: string | null;
      site_url: string | null;
      site_icon: string | null;
      site_description: string | null;
      site_notes: string | null;
      site_order: number | null;
      site_is_public?: number;
      site_created_at: string | null;
      site_updated_at: string | null;
    }>();

    const allNodesMap = new Map<number, GroupTreeNode>();
    const rootNodes: GroupTreeNode[] = [];

    // 第一步：平铺解析所有节点并关联各自持有的直接站点
    for (const row of result.results || []) {
      if (!allNodesMap.has(row.group_id)) {
        allNodesMap.set(row.group_id, {
          id: row.group_id,
          name: row.group_name,
          order_num: row.group_order,
          parent_id: row.group_parent_id,
          is_public: row.group_is_public,
          created_at: row.group_created_at,
          updated_at: row.group_updated_at,
          sites: [],
          sub_menus: [] // 为子菜单腾出空间
        });
      }

      if (row.site_id !== null) {
        const node = allNodesMap.get(row.group_id)!;
        node.sites.push({
          id: row.site_id,
          group_id: row.group_id,
          name: row.site_name!,
          url: row.site_url!,
          icon: row.site_icon || '',
          description: row.site_description || '',
          notes: row.site_notes || '',
          order_num: row.site_order!,
          is_public: row.site_is_public,
          created_at: row.site_created_at!,
          updated_at: row.site_updated_at!,
        });
      }
    }

    // 第二步：根据 parent_id 归类织网，组装成树状依赖
    for (const node of allNodesMap.values()) {
      if (node.parent_id === null || node.parent_id === undefined) {
        // 如果没有父菜单，则是顶级根菜单
        rootNodes.push(node);
      } else {
        // 如果有父级，挂载到父菜单的 sub_menus 里面
        const parentNode = allNodesMap.get(node.parent_id);
        if (parentNode) {
          parentNode.sub_menus.push(node);
        } else {
          // 兜底防御：找不到父节点，当作顶级节点渲染
          rootNodes.push(node);
        }
      }
    }

    return rootNodes;
  }

  async getSite(id: number): Promise<Site | null> {
    const result = await this.db
      .prepare(
        'SELECT id, group_id, name, url, icon, description, notes, order_num, is_public, created_at, updated_at FROM sites WHERE id = ?'
      )
      .bind(id)
      .first<Site>();
    return result;
  }

  async createSite(site: Site): Promise<Site> {
    const result = await this.db
      .prepare(
        `
      INSERT INTO sites (group_id, name, url, icon, description, notes, order_num, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, group_id, name, url, icon, description, notes, order_num, is_public, created_at, updated_at
    `
      )
      .bind(
        site.group_id,
        site.name,
        site.url,
        site.icon || '',
        site.description || '',
        site.notes || '',
        site.order_num,
        site.is_public ?? 1
      )
      .all<Site>();

    if (!result.results || result.results.length === 0) {
      throw new Error('创建站点失败');
    }
    const createdSite = result.results[0];
    if (!createdSite) {
      throw new Error('创建站点失败');
    }
    return createdSite;
  }

  async updateSite(id: number, site: Partial<Site>): Promise<Site | null> {
    const ALLOWED_FIELDS = [
      'group_id',
      'name',
      'url',
      'icon',
      'description',
      'notes',
      'order_num',
      'is_public',
    ] as const;
    type AllowedField = (typeof ALLOWED_FIELDS)[number];

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: (string | number)[] = [];

    Object.entries(site).forEach(([key, value]) => {
      if (ALLOWED_FIELDS.includes(key as AllowedField) && value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      } else if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        console.warn(`尝试更新不允许的字段: ${key}`);
      }
    });

    if (updates.length === 1) {
      throw new Error('没有可更新的字段');
    }

    const query = `UPDATE sites SET ${updates.join(
      ', '
    )} WHERE id = ? RETURNING id, group_id, name, url, icon, description, notes, order_num, is_public, created_at, updated_at`;
    params.push(id);

    const result = await this.db
      .prepare(query)
      .bind(...params)
      .all<Site>();

    if (!result.results || result.results.length === 0) {
      return null;
    }
    return result.results[0] || null;
  }

  async deleteSite(id: number): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
    return result.success;
  }

  // 配置相关API
  async getConfigs(): Promise<Record<string, string>> {
    const result = await this.db.prepare('SELECT key, value FROM configs').all<Config>();
    const configs: Record<string, string> = {};
    for (const config of result.results || []) {
      configs[config.key] = config.value;
    }
    return configs;
  }

  async getConfig(key: string): Promise<string | null> {
    const result = await this.db
      .prepare('SELECT value FROM configs WHERE key = ?')
      .bind(key)
      .first<{ value: string }>();
    return result ? result.value : null;
  }

  async setConfig(key: string, value: string): Promise<boolean> {
    try {
      const result = await this.db
        .prepare(
          `INSERT INTO configs (key, value, updated_at) 
                    VALUES (?, ?, CURRENT_TIMESTAMP) 
                    ON CONFLICT(key) 
                    DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`
        )
        .bind(key, value, value)
        .run();
      return result.success;
    } catch (error) {
      console.error('设置配置失败:', error);
      return false;
    }
  }

  async deleteConfig(key: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM configs WHERE key = ?').bind(key).run();
    return result.success;
  }

  // 批量更新排序
  async updateGroupOrder(groupOrders: { id: number; order_num: number }[]): Promise<boolean> {
    return await this.db
      .batch(
        groupOrders.map((item) =>
          this.db
            .prepare('UPDATE groups SET order_num = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(item.order_num, item.id)
        )
      )
      .then(() => true)
      .catch(() => false);
  }

  async updateSiteOrder(siteOrders: { id: number; order_num: number }[]): Promise<boolean> {
    return await this.db
      .batch(
        siteOrders.map((item) =>
          this.db
            .prepare('UPDATE sites SET order_num = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(item.order_num, item.id)
        )
      )
      .then(() => true)
      .catch(() => false);
  }

  // 导出所有数据
  async exportData(): Promise<ExportData> {
    const groups = await this.getGroups();
    const sites = await this.getSites();
    const configs = await this.getConfigs();
    return {
      groups,
      sites,
      configs,
      version: '1.0', 
      exportDate: new Date().toISOString(),
    };
  }

  // 导入所有数据
  async importData(input: ExportData | unknown): Promise<ImportResult> {
    try {
      const data = normalizeImportData(input);
      const groupMap = new Map<number, number>();

      const stats = {
        groups: { total: data.groups.length, created: 0, merged: 0 },
        sites: { total: data.sites.length, created: 0, updated: 0, skipped: 0 },
      };

      // 导入分组数据
     // 导入分组数据 —— ✨ 先处理主菜单(parent_id为空)，再处理子菜单，保证父级先入库
const sortedGroups = [...data.groups].sort((a, b) => {
  const aIsRoot = a.parent_id === null || a.parent_id === undefined ? 0 : 1;
  const bIsRoot = b.parent_id === null || b.parent_id === undefined ? 0 : 1;
  return aIsRoot - bIsRoot;
});

for (const group of sortedGroups) {
  const existingGroup = await this.getGroupByName(group.name);

  if (existingGroup) {
    if (group.id) {
      groupMap.set(group.id, existingGroup.id as number);
    }
    stats.groups.merged++;
  } else {
    // parent_id 存在但映射不到（父级导入失败/缺失）时，明确降级为顶级菜单，而不是留 undefined
    const newGroupId = group.parent_id ? (groupMap.get(group.parent_id) ?? null) : null;
    const newGroup = await this.createGroup({
      name: group.name,
      order_num: group.order_num,
      parent_id: newGroupId,
      is_public: group.is_public ?? 1,
    });

    if (group.id && newGroup.id) {
      groupMap.set(group.id, newGroup.id);
    }
    stats.groups.created++;
  }
}

      // 导入站点数据
      for (const site of data.sites) {
        const newGroupId = groupMap.get(site.group_id);

        if (!newGroupId) {
          console.warn(`无法为站点"${site.name}"找到对应的分组ID，已跳过`);
          stats.sites.skipped++;
          continue;
        }

        const existingSite = await this.getSiteByGroupIdAndUrl(newGroupId, site.url);

        if (existingSite) {
          await this.updateSite(existingSite.id as number, {
            name: site.name,
            icon: site.icon,
            description: site.description,
            notes: site.notes,
          });
          stats.sites.updated++;
        } else {
          await this.createSite({
            ...site,
            id: undefined, 
            group_id: newGroupId,
          });
          stats.sites.created++;
        }
      }

      for (const [key, value] of Object.entries(data.configs)) {
        if (key !== 'DB_INITIALIZED') {
          await this.setConfig(key, value);
        }
      }

      return { success: true, stats };
    } catch (error) {
      console.error('导入数据失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  async getGroupByName(name: string): Promise<Group | null> {
    const result = await this.db
      .prepare('SELECT id, name, order_num, parent_id, created_at, updated_at FROM groups WHERE name = ?')
      .bind(name)
      .first<Group>();
    return result;
  }

  async getSiteByGroupIdAndUrl(groupId: number, url: string): Promise<Site | null> {
    const result = await this.db
      .prepare(
        'SELECT id, group_id, name, url, icon, description, notes, order_num, is_public, created_at, updated_at FROM sites WHERE group_id = ? AND url = ?'
      )
      .bind(groupId, url)
      .first<Site>();
    return result;
  }
}

export function createAPI(env: Env): NavigationAPI {
  return new NavigationAPI(env);
}
