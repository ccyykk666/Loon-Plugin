# QQ 音乐网络兼容性研究（2026-10-17）

研究对象：用户提供的 QQ 音乐 20.9.0（构建号 21332）IPA，以及启用插件前后的网络记录。用户使用 Loon 3.5.3（1008）；症状为 QQ 音乐加载缓慢、卡顿，使用期间有时伴随 Loon 自动重连，禁用原插件后恢复正常。

公开去广告插件保持停用。网络诊断插件独立提供，不加入常规安装列表。

## 当前结论

1. 原插件至少存在一项已确认的问题：响应脚本在一次启动记录中出现 79 次 `Evaluate script timeout`。这是脚本执行异常的直接证据。
2. 尚不能确认整个应用禁止 MITM。记录中有多个主机成功完成 HTTPS 业务请求，不能用部分连接成功证明所有连接都兼容，也不能把所有取消连接都解释为证书锁定。
3. IPA 中找到一个具体的证书校验兼容性疑点：特定网络管理器的自定义认证分支，会把证书验证名称改为 `*.y.qq.com`，再调用系统信任校验。若代理证书仅包含具体主机名，此分支可能出现名称匹配问题。这是待验证假设，不能视为本机已确认根因。
4. 已追踪的聚合 JSON 响应解析路径使用 Brotli/zlib 解压、UTF-8 校验和 JSON 解析；该路径没有发现额外 AES 解密或响应签名校验步骤。不能据此排除应用其他接口使用加密。
5. 最近一次短记录里，v3 脚本仅触发三次，均为普通上报请求并原样放行，没有生成无广告 Mock。这个时间窗口本身不足以证明 Mock 数据触发了卡顿。

## IPA 静态证据

以下为未重定位的 Mach-O 虚拟地址，来自只读反汇编。没有修改、重签名或运行 IPA。

| 方法或代码位置 | 地址 | 观察 |
| --- | --- | --- |
| `+[AFSecurityPolicy defaultPolicy]` | `0x100ded4dc` | 调用 `setSSLPinningMode:` 时参数为 0；默认策略本身没有开启证书或公钥固定 |
| `-[QMHTTPConfigs initWithConfigs:msisConfigs:]` | `0x107d4c17c` | 按系统条件读取 `iOS26AFNDefaultSecTrust` 等配置 |
| `-[QMHTTPConfigs isEnableForKey:]` | `0x107d4cdd8` | 配置取值与用户分组区间有关；不能仅凭字符串存在推断当前设备启用了某分支 |
| `+[AFHTTPSessionManager(QMHTTP) qmhttp_managerWithType:name:configuration:]` | `0x10b33f410` | 创建网络管理器，并把上述配置传入认证回调 |
| 上述方法的认证回调 | `0x10b33f6bc` | 对管理器类型 1、5、6 的一个条件分支执行自定义服务端信任处理 |
| 自定义认证分支 | `0x10b33f85c` 起 | 主机以 `.y.qq.com` 结尾或为 IP 时，创建验证名称为 `*.y.qq.com` 的 SSL policy，随后调用 `SecTrustSetPolicies`、`SecTrustEvaluate` |
| `-[ProtocolUniteRequest dictionaryFromCompressedData:protocolError:]` | `0x10ae4117c` | 根据 `compressType` 解压，校验 UTF-8，再解析 JSON、检查业务状态 |
| `-[ProtocolCom internalUnZippedData:useBrotli:]` | `0x109d8fb5c` | 分别调用 `brotliDecompressed` 和 `GZIPHelper uncompressZippedData:` |
| `-[ProtocolUniteRequest isDataBeginWithFiveZero]` | `0x1000f9504` | 返回 false；不能把旧接口的 5 字节响应头处理机械套用于这个聚合接口 |
| `brotliDecompressedAllowPartialInput:` | `0x10103a50c` | 使用流式解码和 8 KB 输出缓冲区，不是读取密钥后解密的路径 |

证书校验的关键逻辑可概括为：

```text
特定管理器类型，且没有选择默认信任处理时：
    取 serverTrust 与 challenge host
    如果 host 属于 .y.qq.com 或是 IP：
        将 SSL policy 的验证名称设为 *.y.qq.com
    执行 SecTrustEvaluate
    根据系统信任结果决定是否提供 credential
```

当前未取得该次连接实际使用的代理叶证书 SAN，也未从捕获数据中取得 `iOS26AFNDefaultSecTrust` 的实际配置值。因此，不宣称该条件分支已在用户设备上触发。

Apple 说明 SSL policy 中的验证名称需要与证书 Common Name 或 Subject Alternative Name 匹配，详见 [Overriding TLS Chain Validation Correctly](https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/NetworkingTopics/Articles/OverridingSSLChainValidationCorrectly.html)。AFNetworking 默认策略的源码见 [AFSecurityPolicy.m](https://github.com/AFNetworking/AFNetworking/blob/master/AFNetworking/AFSecurityPolicy.m)。

## 连接终止证据

最新短记录中，三条请求都已经发出 HTTP/2 Header 和 Body，复用了同一上游连接；随后出现 `Session closing...` 和 `Client stream closed error code:-530`。

按开始时间与持续时间计算，三条请求都在 **16:49:51.295（UTC+8）** 结束。这说明存在共同的会话关闭事件。该记录没有说明会话为什么关闭，也没有直接记录证书验证失败；不能把 `-530` 自行映射为证书锁定、内存不足或特定系统错误。

在这段记录里，v3 的三次触发对应 `music.platform.RecTabReport.Report`，均无请求或响应修改。需要更完整的运行日志才能判断自动重连是否由脚本、隧道进程或网络切换触发。

## 分阶段诊断

诊断插件：[qqmusic_diagnostic.lpx](https://raw.githubusercontent.com/ccyykk666/Loon-Plugin/main/plugins/qqmusic/qqmusic_diagnostic.lpx)

所有阶段都以 `$done({})` 原样放行，不生成 Mock，不改变 Header、URL、Body 或业务字段。日志只记录阶段、正文类型、长度、解析结果和脚本内部耗时，不打印正文、Cookie 或账号。

| 阶段 | 增加的处理 | 用途 |
| --- | --- | --- |
| 0（默认） | 只加入 `u6.y.qq.com`、`szu6.y.qq.com` 的 MITM；没有脚本执行 | 检查 MITM/证书/HTTP 协议兼容性 |
| 1 | 请求 Header 阶段运行一个极小的放行脚本 | 检查启动脚本的影响 |
| 2 | 读取完整请求 Body，记录类型与长度后放行 | 区分正文等待和脚本初始化开销 |
| 3 | 请求 Body 解压、JSON 解析后放行 | 检查请求解压解析负载 |
| 4 | 读取完整响应 Body，记录类型与长度后放行 | 检查响应缓冲和响应脚本阶段 |
| 5 | 响应 Body 解压、JSON 解析后放行 | 复现旧版解压负载，区分解压开销和业务改写影响 |

测试顺序：

1. 保持原“QQ音乐去广告”插件禁用，只启用诊断插件。不要同时启用其他处理 QQ 音乐相同接口的脚本。
2. 从阶段 0 开始。每次切换阶段后，重启一次 Loon 连接，再彻底退出并重开 QQ 音乐，避免复用上一步的连接。
3. 每阶段只在同样的首页操作约 30 秒，记录加载是否正常、是否出现额外自动重连。人工重启 Loon 的时间不要计为异常重连。
4. 找到最先异常的阶段后，先返回前一个正常阶段复核；不必继续增加处理。
5. 回传最先异常阶段的 HAR、相应时段的 Loon 运行日志和阶段编号。若有自动重连，日志需覆盖重连前后；仅导出重连后的几秒 HAR 可能缺失原因。

若主配置或其他插件已经单独对同样主机启用 MITM，关闭诊断插件并不等于关闭 MITM；对照时应记录这部分配置。无需提供订阅、节点密码或登录凭据。

判断原则：

- 阶段 0 已异常：脚本和广告数据改写不是这次最小复现的必要条件，优先核对 TLS 认证、连接协议和 MITM 范围。
- 阶段 0 正常，阶段 1 异常：优先检查脚本调度/运行时。
- 阶段 1 正常，阶段 2 异常：优先检查请求正文等待与缓冲。
- 阶段 2 正常，阶段 3 异常：优先检查解压解析负载及运行时差异。
- 阶段 4 或阶段 5 才异常：优先检查响应缓冲或解压并发。
- 全部正常：仍不能证明旧版业务改写安全；应另做单个模块、单个字段的对照，不能直接恢复旧版。

脚本日志中的 `elapsed_ms` 只表示脚本内部计时区间，不包含完整的 JS 环境创建、脚本编译、排队或网络等待，不能单独用它证明没有延迟。

## 验证边界

已完成真实请求/响应的本地回放、异常放行检查、输入字节不变检查、一次请求只调用一次 `$done` 检查，以及各阶段条件与 URL 边界检查。阶段 0 不执行任何脚本，各非零阶段只选择一条规则。

尚未完成用户设备上的分阶段运行。现阶段确认的是静态实现与捕获证据，最终根因仍待最小对照结果和完整运行日志确认。
