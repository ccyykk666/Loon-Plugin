// 京东响应净化

const url = $request.url;
const functionId = url.match(/[?&]functionId=([^&#]*)/)?.[1] || "";
const options = {
  HomeClean: true,
  OrderAds: true,
  ProfileClean: true,
  ProductClean: true
};
if (typeof $argument === "object" && $argument !== null) {
  for (const name of Object.keys(options)) {
    if (!Object.prototype.hasOwnProperty.call($argument, name)) continue;
    const value = $argument[name];
    options[name] =
      value === true || value === "true" || value === 1 || value === "1";
  }
}
const rawRequestBody =
  typeof $request.body === "string" ? $request.body : "";
const requestHeaders =
  typeof $request.headers === "object" && $request.headers !== null
    ? $request.headers
    : {};
const requestHeader = (name) => {
  const key = Object.keys(requestHeaders).find(
    (item) => item.toLowerCase() === name.toLowerCase()
  );
  return key ? String(requestHeaders[key] || "") : "";
};
const requestRefererPage = requestHeader("x-referer-page");
let decodedRequestBody = rawRequestBody;
try {
  decodedRequestBody = decodeURIComponent(rawRequestBody);
} catch (_) {}
const requestContext = `${rawRequestBody}\n${decodedRequestBody}`;

const clearRecommendResponse = (obj) => {
  if (Array.isArray(obj?.wareInfoList)) obj.wareInfoList = [];
  if (Array.isArray(obj?.tabs)) obj.tabs = [];
  if (obj?.tabTnInfo) obj.tabTnInfo = {};
  if (Object.prototype.hasOwnProperty.call(obj, "adIds")) obj.adIds = "";
  if (Object.prototype.hasOwnProperty.call(obj, "title")) delete obj.title;
  if (Object.prototype.hasOwnProperty.call(obj, "dmTitle")) delete obj.dmTitle;
};

if (!$response.body) {
  $done({});
} else {
  try {
    let obj = JSON.parse($response.body);

  if (
    options.OrderAds &&
    ["deliverLayer", "orderTrackBusiness"].includes(functionId)
  ) {
    // 物流页面：优惠横幅及地图上方的寄件推广条。
    if (obj?.bannerInfo) delete obj.bannerInfo;
    if (obj?.floors?.length > 0) {
      obj.floors = obj.floors.filter(
        (floor) =>
          !["banner", "jdDeliveryBanner", "noticeFloorTrack"].includes(
            floor?.mId
          )
      );
      for (const floor of obj.floors) {
        if (floor?.mId === "orderTrackList" && floor?.data?.allPackages) {
          delete floor.data.allPackages;
        }
      }
    }
  } else if (options.OrderAds && functionId === "myOrderInfo") {
    // 订单页面：横幅、常购推荐、PLUS 推广和精选特惠。
    const cleanOrderFloors = (floors) => {
      if (!Array.isArray(floors)) return floors;

      let newFloors = [];
      for (let floor of floors) {
        if (
          [
            "async_circleTopicFloor",
            "async_taro_contentGrassUpFloor",
            "bannerFloor",
            "bpDynamicFloor",
            "plusFloor"
          ].includes(floor?.mId)
        ) {
          continue;
        }

        if (floor?.mId === "virtualServiceCenter") {
          const centers = floor?.data?.virtualServiceCenters;
          if (centers?.length > 0) {
            for (let center of centers) {
              if (center?.serviceList?.length > 0) {
                center.serviceList = center.serviceList.filter(
                  (card) => card?.serviceTitle !== "精选特惠"
                );
              }
            }
          }
        }

        if (floor?.mId === "customerServiceFloor" && floor?.data?.moreText) {
          if (floor.data.moreIcon) delete floor.data.moreIcon;
          if (floor.data.moreIcon_dark) delete floor.data.moreIcon_dark;
          floor.data.moreText = " ";
        }

        newFloors.push(floor);
      }
      return newFloors;
    };

    // 兼容根节点及 data.floors 两种楼层结构。
    obj.floors = cleanOrderFloors(obj?.floors);
    if (obj?.data) obj.data.floors = cleanOrderFloors(obj.data.floors);
  } else if (options.OrderAds && functionId === "queryFloorDetailInfo") {
    // 订单详情页：内容种草、PLUS 和专属权益楼层。
    const removeFloorIds = [
      "async_circleTopicFloor",
      "async_recommendFloor",
      "async_taro_contentGrassUpFloor",
      "bpDynamicFloor",
      "plusFloor"
    ];
    if (obj?.floors?.length > 0) {
      obj.floors = obj.floors.filter((floor) => {
        return (
          !removeFloorIds.includes(floor?.mId) &&
          floor?.data?.title !== "搭配推荐"
        );
      });
    }
    if (obj?.data?.floors?.length > 0) {
      obj.data.floors = obj.data.floors.filter((floor) => {
        return (
          !removeFloorIds.includes(floor?.mId) &&
          floor?.data?.title !== "搭配推荐"
        );
      });
    }
  } else if (options.OrderAds && functionId === "queryListAsyncInfo") {
    // 订单卡片下方的优惠券、PLUS 权益等营销引力条。
    if (obj?.data && typeof obj.data === "object") {
      obj.data.guide = {};
    }
  } else if (options.OrderAds && functionId === "newUserAllOrderList") {
    // 订单页“秒送”旁的外卖图标，以及“服务”旁的搬家轮播图。
    const navigationTabs = obj?.listNavigationTabList;
    if (Array.isArray(navigationTabs)) {
      for (const tab of navigationTabs) {
        if (String(tab?.tabId) === "2") {
          // 保留“秒送”Tab，只清空右侧图标和动画素材。
          tab.tabIconUrl = "";
          tab.tabIconDarkUrl = "";
          tab.tabIconWidth = 0;
          tab.tabIconHeight = 0;
          tab.deliveryLottieMap = {};
          tab.deliveryLottieUrl = "";
          tab.iosDeliveryLottieUrl = "";
          tab.showDeliveryClose = false;
        } else if (String(tab?.tabId) === "3") {
          // 保留“服务”Tab，只清空右侧轮播营销图。
          tab.tabIconUrl = "";
          tab.tabIconDarkUrl = "";
          tab.tabIconWidth = 0;
          tab.tabIconHeight = 0;
          tab.carouselIconList = [];
          tab.carouselIconDarkList = [];
          tab.carouselNum = 0;
        }
      }
    }

    // 订单卡片中的“一键评分”和按钮上方的“全屋保障”推广条。
    for (const order of obj?.orderList || []) {
      const guide = order?.operateGuideFloor;
      if (
        guide?.clickPoint === "OrderList_InsuranceTip" ||
        guide?.exPoint === "OrderList_InsuranceTipExpo" ||
        guide?.clickPoint === "OrderList_QuickEvaluate" ||
        guide?.exPoint === "OrderList_QuickEvaluateExpo"
      ) {
        delete order.operateGuideFloor;
      }

      // 保留“评价晒单”按钮，只去掉按钮上方的优惠券推广标签。
      for (const button of order?.buttons || []) {
        if (
          button?.btnEvent?.clickPoint === "OrderList_CommentsShare" &&
          button?.businessMap &&
          Object.prototype.hasOwnProperty.call(
            button.businessMap,
            "cancelDetainText"
          )
        ) {
          delete button.businessMap.cancelDetainText;
        }
      }
    }
  } else if (options.ProfileClean && functionId === "personinfoBusiness") {
    // “我的”页面。
    const removeFloorIds = [
      "bigSaleFloor",
      "buyOften",
      "marketTNFloor",
      "newAttentionCard",
      "newBigSaleFloor",
      "newCardFloor",
      "newStyleAttentionCard",
      "newsFloor",
      "noticeFloor",
      "recommendfloor",
      "simpleCardFloor"
    ];

    const cleanFloors = (floors) => {
      if (!Array.isArray(floors)) return floors;

      let newFloors = [];
      for (let floor of floors) {
        if (removeFloorIds.includes(floor?.mId)) continue;

        if (floor?.mId === "marketTNFloorNew") {
          const tnData = floor?.data?.tnData;

          // nodes 是钱包、京东服务和互动游戏整块；
          // cardListStatic 是抽奖开红包。保留行为统计和物流卡片。
          if (Array.isArray(tnData?.nodes) || Array.isArray(tnData?.cardListStatic)) {
            continue;
          }

          // 头像卡右侧的学生会员推广，保留头像、会员等级等账户信息。
          if (tnData?.concisePlusInfo) delete tnData.concisePlusInfo;
          // 左上角“点评 每日签到”滚动快讯。
          if (tnData?.newsInfo) delete tnData.newsInfo;
        } else if (floor?.mId === "basefloorinfo") {
          if (floor?.data?.commonPopup) delete floor.data.commonPopup;
          if (floor?.data?.commonPopup_dynamic) delete floor.data.commonPopup_dynamic;
          if (floor?.data?.floatLayer) delete floor.data.floatLayer;
          if (floor?.data?.commonTips?.length > 0) floor.data.commonTips = [];
          if (floor?.data?.commonWindows?.length > 0) floor.data.commonWindows = [];
        } else if (floor?.mId === "orderIdFloor") {
          if (floor?.data?.commentRemindInfo?.infos?.length > 0) {
            floor.data.commentRemindInfo.infos = [];
          }
        } else if (floor?.mId === "userinfo") {
          if (floor?.data?.newPlusBlackCard) delete floor.data.newPlusBlackCard;
        }

        newFloors.push(floor);
      }
      return newFloors;
    };

    obj.floors = cleanFloors(obj?.floors);
    if (obj?.others) obj.others.floors = cleanFloors(obj.others.floors);
  } else if (
    options.ProfileClean &&
    functionId === "queryCircleInfo"
  ) {
    // 档案页底部双列资讯推荐流。
    if (Array.isArray(obj?.wareInfoList)) obj.wareInfoList = [];
    if (Object.prototype.hasOwnProperty.call(obj, "hasNextPage")) {
      obj.hasNextPage = false;
    }
    if (Object.prototype.hasOwnProperty.call(obj, "hasNext")) {
      obj.hasNext = false;
    }
  } else if (
    options.ProfileClean &&
    functionId === "myjdSetBusiness"
  ) {
    // 设置页“必备工具”是独立楼层，可整层删除。
    if (Array.isArray(obj?.floors)) {
      obj.floors = obj.floors.filter((floor) => {
        const nodes = floor?.data?.nodes;
        return (
          floor?.refId !== "TN_settingsToolFloors" &&
          !nodes?.some((node) => node?.functionId === "changyonggongju")
        );
      });

      // 清空账号设置、功能设置等菜单的右侧说明和红点；
      // 保留名称、图标及跳转。地区项由客户端维护，不做修改。
      for (const floor of obj.floors) {
        const templateId = String(floor?.tnConfig?.templateId || "");
        if (!templateId.includes("jdmine_setting_menu")) continue;

        for (const node of floor?.data?.nodes || []) {
          if (node?.functionId === "i18n") continue;
          if (node?.subtitle && typeof node.subtitle === "object") {
            node.subtitle.value = "";
          }
          if (Object.prototype.hasOwnProperty.call(node, "showRedDot")) {
            node.showRedDot = 0;
          }
          if (Object.prototype.hasOwnProperty.call(node, "redDotType")) {
            node.redDotType = 0;
          }
        }
      }
    }
  } else if (functionId === "start") {
    // 开屏广告。
    if (obj?.images?.length > 0) obj.images = [];
    if (Object.prototype.hasOwnProperty.call(obj, "showTimesDaily")) {
      obj.showTimesDaily = 0;
    }
  } else if (
    options.HomeClean &&
    functionId === "welcomeHome"
  ) {
    // 首页浮层、运营活动板块及顶部多余 Tab。
    const removeTypes = [
      "bottomXview",
      "dynamicIcon",
      "float",
      "hybrid",
      "photoCeiling",
      "ruleFloat",
      "searchIcon",
      "tabBarAtmosphere",
      "topRotate"
    ];

    if (obj?.floorList?.length > 0) {
      obj.floorList = obj.floorList.filter(
        (floor) => !removeTypes.includes(floor?.type)
      );
    }
    if (obj?.webViewFloorList?.length > 0) obj.webViewFloorList = [];
    if (obj?.promotionTabs) delete obj.promotionTabs;

    // 首页顶部“秒送”Tab 右侧的外卖图片角标。
    const topTabs = obj?.multipleTabs?.content?.data;
    if (Array.isArray(topTabs)) {
      const deliveryTab = topTabs.find(
        (tab) => Number(tab?.id) === 495057
      );
      if (deliveryTab) {
        deliveryTab.labelNormal = "";
        deliveryTab.labelDark = "";
        deliveryTab.labelDeep = "";
        deliveryTab.keepLabel = 0;
        deliveryTab.labelWidth = 40;
      }

      // 首页顶部“特价”和“新品”均为服务端下发的独立 Tab。
      obj.multipleTabs.content.data = topTabs.filter(
        (tab) => ![482858, 482857].includes(Number(tab?.id))
      );
    }
  } else if (options.HomeClean && functionId === "clickRecommend") {
    // 搜索结果中使用独立模板渲染的 AI 推荐卡。
    if (obj?.data?.length > 0) {
      obj.data = obj.data.filter(
        (item) => !(item?.insertBizData && item?.tnTemplate)
      );
    }
  } else if (options.HomeClean && functionId === "hotSearchTerms") {
    // 首页顶部“作业帮”商业热词。
    if (obj?.data?.length > 0) {
      for (let group of obj.data) {
        if (!Array.isArray(group?.hotSearchContent)) continue;
        group.hotSearchContent = group.hotSearchContent.filter((item) => {
          const text = [item?.iconText, item?.title, item?.showWord]
            .filter(Boolean)
            .join(" ");
          return !text.includes("作业帮");
        });
      }
    }
  } else if (
    options.ProductClean &&
    functionId === "querySmallVideoWindow"
  ) {
    // 商品页右上角自动出现的小视频窗口。
    if (obj?.result?.contents?.length > 0) obj.result.contents = [];
  } else if (
    options.ProductClean &&
    functionId === "aigc_guide"
  ) {
    // 商品详情页右下角 AI 浮动入口。
    obj.data = {};
  } else if (options.ProductClean && functionId === "wareBusiness") {
    if (options.ProductClean) {
      // “直播讲解”和“红包雨”共用 liveInfo 浮层数据。
      const data = obj?.commonBaseInfo?.data;
      if (data?.liveInfo) delete data.liveInfo;
      // 商品页右侧“活动小助手/国家补贴”等营销助手浮窗。
      if (data?.floatingAssistant) delete data.floatingAssistant;
      if (obj?.shareData?.statusInfo) {
        obj.shareData.statusInfo.livewindow = false;
      }

      // “大家评”中的 AI 评价概要，不影响商品主图的 AI 使用说明。
      if (data?.daJiaPing?.floorQoList?.length > 0) {
        for (let item of data.daJiaPing.floorQoList) {
          if (Object.prototype.hasOwnProperty.call(item, "aiOverview")) {
            item.aiOverview = "0";
          }
        }
      }
    }

    if (options.ProductClean && obj?.floors?.length > 0) {
      // “为你推荐”和“潮流配件馆”同属 bpyxlc14 融合楼层。
      obj.floors = obj.floors.filter((floor) => floor?.mId !== "bpyxlc14");
    }

    if (obj?.floors?.length > 0) {
      // 商品详情页会员权益、赠礼、活动及社区种草等非核心推广楼层。
      const removeFloorIds = [
        "ActivityFloor",
        "bpGiveGifts",
        "bpGjhs2",
        "bpdarenping14",
        "cardBenefitLx",
        "preferenceMore"
      ];
      obj.floors = obj.floors.filter(
        (floor) => !removeFloorIds.includes(floor?.mId)
      );
    }
  } else if (options.ProductClean && functionId === "queryEvaluateFloors") {
    // 评价页“AI 全网评”，保留普通评价、标签和晒单。
    const result = obj?.result;
    if (result && typeof result === "object") {
      for (let section of Object.values(result)) {
        if (!section || typeof section !== "object") continue;
        if (Object.prototype.hasOwnProperty.call(section, "AIcomment")) {
          section.AIcomment = "0";
        }
        if (section.aiCommentInfo) delete section.aiCommentInfo;
        if (section?.commentIconInfo?.aiTitleIcon) {
          delete section.commentIconInfo.aiTitleIcon;
        }
        if (section?.commentIconInfo?.darkAiTitleIcon) {
          delete section.commentIconInfo.darkAiTitleIcon;
        }
        for (let listName of ["semanticTagList", "tagStatisticsinfoList"]) {
          for (let item of section?.[listName] || []) {
            if (item?.aiCommentInfo) delete item.aiCommentInfo;
          }
        }
      }
    }
  } else if (functionId === "uniformRecommend6") {
    // 购物车 source=6 推荐商品流。
    clearRecommendResponse(obj);
  } else if (functionId === "uniformRecommend") {
    const isOrderRecommend =
      requestContext.includes("JDOrderTest_p_detail") ||
      requestContext.includes("JDOrderTest_p_orderlist") ||
      ["2338", "4262"].includes(String(obj?.adIds || ""));
    const isLogisticsRecommend =
      requestRefererPage === "JDOrderTrackBigMapViewController" ||
      (requestContext.includes('"source":4') &&
        requestContext.includes('"newUIStyle":true') &&
        requestContext.includes('"dlvAddr"'));
    const isMessageRecommend =
      requestContext.includes("NavigationBar_DeployButton") ||
      requestContext.includes('"source":101') ||
      String(obj?.adIds || "") === "50840" ||
      (Array.isArray(obj?.tabs) && obj?.tabTnInfo);

    if (
      (options.OrderAds && (isOrderRecommend || isLogisticsRecommend)) ||
      isMessageRecommend
    ) {
      clearRecommendResponse(obj);
    }
  }

    $done({ body: JSON.stringify(obj) });
  } catch (error) {
    console.log("京东净化失败，放行原响应: " + error);
    $done({});
  }
}
