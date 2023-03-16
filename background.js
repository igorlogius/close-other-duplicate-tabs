/* global browser */

const delayed_updateBA_timeout = 3000;
const tabId2dupTabIds = new Map();

let delayed_updateBA_timerId;

async function onBAClicked(tab) {
  delDups(tab.id);
}

async function getDups(check_tab) {
  return (
    await browser.tabs.query({
      windowId: check_tab.windowId,
      hidden: false,
      pinned: false,
    })
  )
    .filter((t) => t.id !== check_tab.id)
    .filter(
      (t) =>
        t.url === check_tab.url && t.cookieStoreId === check_tab.cookieStoreId
    )
    .map((t) => t.id);
}

function delDups(tabId) {
  const dupTabIds = tabId2dupTabIds.get(tabId);
  if (dupTabIds.length > 0) {
    browser.tabs.remove(dupTabIds);
  }
}

async function delayed_updateBA(tabId) {
  clearTimeout(delayed_updateBA_timerId);
  delayed_updateBA_timerId = setTimeout(async () => {
    updateBA(tabId);
  }, delayed_updateBA_timeout);
}

async function handleActivated(activeInfo) {
  delayed_updateBA(activeInfo.tabId);
}

async function updateBA(tabId) {
  const dupTabIds = await getDups(await browser.tabs.get(tabId));
  tabId2dupTabIds.set(tabId, dupTabIds);
  if (dupTabIds.length > 0) {
    browser.browserAction.enable(tabId);
    browser.browserAction.setBadgeText({
      tabId: tabId,
      text: "" + dupTabIds.length,
    });
    browser.browserAction.setTitle({
      tabId: tabId,
      title: "Close " + dupTabIds.length + " duplicates",
    });
  } else {
    browser.browserAction.disable(tabId);
    browser.browserAction.setBadgeText({ tabId: tabId, text: "" });
    browser.browserAction.setTitle({ tabId: tabId, title: "" });
  }
}

// init
(async () => {
  browser.browserAction.disable();
})();

// register listeners
browser.browserAction.onClicked.addListener(onBAClicked);
browser.tabs.onActivated.addListener(handleActivated);
