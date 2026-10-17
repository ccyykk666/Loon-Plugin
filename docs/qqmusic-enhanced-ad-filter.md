# QQ 音乐扩展净化版（2026-10-17）

用户认为仅独立广告 SDK 的保守版对截图没有明显效果，明确要求更彻底地去广告。本次扩大到截图关联的服务端推广控制字段，覆盖此前“只处理独立广告接口”的范围限制；继续沿用用户不希望逐阶段抓包验证的偏好。

## 本版处理目标

| 目标 | 请求服务或接口 | 精确修改 |
| --- | --- | --- |
| 独立广告 SDK | `music.y.qq.com/maproxy/getInfo` | 保留原生 JQ，清空成功响应中的广告列表 |
| 首页会员福利模块 | `music.yiflow.Nexus.GetAds` | 仅 appID=1、adposID=899374、scene=2，且响应广告 ID=899426 时，将 `ad.enabled` 设为 false |
| AI 唱歌及迷你播放器提示 | `music.venus.VenusMusicAiSongCoversApi.HandleGetPlayPageIcon` | 仅 id=aihelpsing；关闭 enable、移除对应 icons 项、清空 extra 中的 minibartext/minibarurl |
| 有声推荐会员横条 | `music.longRadio.LongRadioOperationBannerSvr.GetRecShelfVipBanner` | 仅 source=8，将 banner 设为 null，保留 popupCnt 及其他字段 |
| 智能设备会员入口 | `music.iotSmartDevice.IotSmartDeviceSvr.GetEntry` | 将 hasEntry 设为 false，保留设备状态 |
| 个人页游戏推广入口 | `music.UniformResource.MusicUniformResourceSvr.GetMyEntranceIconRes` | 仅 Scheme 指向 musicworld/openGame 时，将 IsShow 设为 false |
| 更多页歌曲加热、星光农场 | `music.moreSetting.GameEntrySvr.getGameEntryList` | 移除 ID=10、12 的 entries 及对应 priority；保留装扮中心、成就勋章等其他项 |
| 网赚快捷推广入口 | `music.opsBase.EntranceSvr.GetEntranceInfos` | 仅 eType=5 的请求，移除同类型且指向 i2.y.qq.com/n3/coin_center/ 的入口，保留其他入口 |
| 免流领会员促销横幅 | `music.vipcgi.BannerDispatcherCgi.ListCommonBanners` | 仅移除 type=free_flow 且 businessID=10001 的 candidates |

这些目标都有捕获中的服务名、参数、字段和结构依据，不按界面中文递归删节点。没有将小游戏入口当作金币卡片，也没有将免流促销横幅当作整个“更多”页的免流菜单。

## 实现及性能边界

[安装插件](https://raw.githubusercontent.com/ccyykk666/Loon-Plugin/main/plugins/qqmusic/qqmusic_ad.lpx) 保留原生广告 SDK 规则，并新增默认开启的“深度净化（首页、播放器、个人页）”开关。新增单条响应脚本只覆盖 u6、szu6、shu6 三个精确主机的 musics.fcg、POST、JSON 协议、HTTP 200、application/octet-stream 且没有 HTTP Content-Encoding 的响应。4385 条历史样本均符合这些格式约束；不猜测 HTTP 压缩与内部压缩叠加时的处理方式。

服务名位于五字节前缀加 zlib 的请求正文中，无法仅靠 URL 在配置层精确区分这些服务。因此，配置层仍需要等待这类请求的响应正文并进入小请求筛选器；这部分缓冲、脚本获取、环境创建、编译及请求解码开销并未消失。不能把“没有解码无关响应”说成“无关请求完全不会触发脚本”。

脚本只有在请求中找到上述目标后才调用完整响应解码库；其他业务原样放行，不读取其响应 Body 到用户代码。响应库采用延迟调用的工厂函数，但约 130 KB 的源文件仍需获取和解析，不能仅凭工厂函数存在就保证 Loon 的前置开销很小。目标请求如果聚合正常业务，只修改对应子响应的精确字段，其他子响应保持原值。

本版移除末尾定时器、逐请求日志及持久化读写，同步调用一次 `$done`。这是保留此前同步探针改善超时的线索，不是声称扩展版已经通过真机稳定性验证。新增解码、字段修改和编码仍可能影响性能，不能直接套用小探针的零超时结果。

请求体不超过 64 KiB，解码后的请求不超过 256 KiB，响应及解码输出限制为 4 MiB；这些检查不是原生运行时内存总量上限。只有顶层 code=0、对应子服务 code=0 且目标结构符合时才修改。解析、解码、编码或结构检查失败时返回空结果，交还原始数据；该机制不能覆盖 JavaScript 尚未开始或原生交付阶段的问题。

输出保持原来的 JSON、zlib 或 Brotli 表示。Brotli 使用已离线校验的非压缩数据块输出，未改变应用证书校验、签名、请求头、请求正文或会员权限。响应长度改变时删除旧 Content-Length；仅发生修改时加入不含账号信息的 `X-Loon-QQMusic` 版本及类别标记。没有生成假业务成功包或观看广告奖励。

语法和完成回调依据 [Loon Script 文档](https://nsloon.app/docs/Script/script_v2/) 及 [Script API](https://nsloon.app/docs/Script/script_api/)。fflate、Brotli.js 和 base64-js 的许可保留在脚本头部及 [许可文件](../plugins/qqmusic/qqmusic_enhanced.LICENSE.txt)。

## 离线验证

对用户已提供的 17 份捕获做定向回放，包含符合新增响应脚本条件的 4385 条历史响应：

| 结果 | 数量 |
| --- | ---: |
| 调用完整响应解码库 | 209 |
| 没有调用完整响应解码库 | 4176 |
| 实际发生目标字段变化 | 189 |
| 原样放行 | 4196 |

修改按类别为：会员福利 54、有声横条 35、智能设备入口 1、AI 提示 2、个人页游戏 7、更多页推广 20、网赚入口 26、免流横幅 44。这里是历史记录计数，不能将其换算成手机上已消失的组件数或实际运行耗时。

回放检查了只允许的字段发生变化，混合请求中的正常歌曲及账号数据、其他子服务与状态保留，请求/响应输入字节不被原地修改，每次只提交一次同步完成，没有定时器。重复处理已净化的内容保持不变。

另检查 25 个针对性边界：缺失或畸形正文、超限正文、错误业务状态、不可读的响应、路径/方法/协议不符、请求前缀首字节恰好为左大括号，以及 JSON/zlib/Brotli 三种输出、超过单个 Brotli 数据块的正文、缺少 TextEncoder/TextDecoder 的环境和混合业务保留。对 JSON Content-Type 或带 HTTP Content-Encoding 的响应，在读取请求正文前即放行。完成 JavaScript 语法及配置 URL、参数、类型边界检查，保守版原生 JQ 规则保持原样。

上述是桌面离线检查，不是 Loon 真机导入、界面消失或长期稳定性验证。没有再次要求用户逐阶段抓包。

## 保留的内容及使用方式

个人页会员卡、续费按钮、金币卡片，更多页腾讯视频福利及部分固定菜单，仍未取得可靠的整块隐藏控制字段。本版没有重复采用此前未确认有效的 topRightInfo=null，也没有改写会员到期信息或清空整个账号模块。不能称为所有推广全清。

保持两份 QQ 音乐诊断插件关闭，更新同一份“QQ音乐去广告”，保持深度净化默认开启，重启一次 Loon 连接后正常使用即可，无需选阶段、开抓包或回传日志。若加载再次明显变慢，可直接关闭深度净化开关停止新增共用接口脚本；原生独立广告规则继续保留。开关不会动态删除这几个主机的 MITM 配置，彻底禁用插件才会移除由本插件添加的 MITM 范围，其他主配置的 MITM 仍由原配置决定。
