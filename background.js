/* global browser */

// tabId => { url, cookiestore, lastAccessed, created }
const tabdata = new Map();

// tabId => [tabId, tabid  ]  dups
const dupdata = new Map();

const delayed_updateBA_timeout = 500;

let delayed_updateBA_timerId;

async function delayed_updateBA() {
  clearTimeout(delayed_updateBA_timerId);
  delayed_updateBA_timerId = setTimeout(async () => {
    updateBA();
  }, delayed_updateBA_timeout);
}

function updateDupData() {
  for (const [tabId, t0] of tabdata) {
    const t0_dups = [...tabdata]
      .filter(
        ([k, v]) =>
          k !== tabId &&
          t0.url === v.url &&
          t0.cookieStoreId === v.cookieStoreId
      )
      .map(([k]) => k);

    dupdata.set(tabId, t0_dups);
  }
}

// delete duplicates
function delDups(tabId) {
  if (dupdata.has(tabId)) {
    const tmp = dupdata.get(tabId);
    if (tmp.length > 0) {
      browser.tabs.remove(tmp);
    }
  }
}

//
function updateBA() {
  updateDupData();
  for (const [k, v] of dupdata) {
    if (v.length > 0) {
      browser.browserAction.enable(k);
      browser.browserAction.setBadgeText({ tabId: k, text: "" + v.length });
      browser.browserAction.setTitle({
        tabId: k,
        title: "Close " + v.length + " Duplicates",
      });
    } else {
      browser.browserAction.disable(k);
      browser.browserAction.setTitle({
        tabId: k,
        title: "No Duplicates to Close",
      });
      browser.browserAction.setBadgeText({ tabId: k, text: "" });
    }
  }
}

// init button + popuplate tabdata cache
(async () => {
  browser.browserAction.disable();
  browser.browserAction.setBadgeText({ text: "" });
  browser.browserAction.setBadgeBackgroundColor({ color: "orange" });
  //browser.browserAction.setBadgeBackgroundColor({ color: "green" });
  browser.browserAction.setTitle({ title: "No Duplicates to Close" });

  (
    await browser.tabs.query({
      currentWindow: true,
      hidden: false,
      pinned: false,
    })
  ).forEach((t) => {
    tabdata.set(t.id, {
      url: t.url,
      cs: t.cookieStoreId,
      lastAccessed: t.lastAccessed,
      created: Date.now(),
    });
  });
  delayed_updateBA();
})();

// register listeners

// update cache
browser.tabs.onUpdated.addListener(
  (tabId, changeInfo, t) => {
    if (typeof changeInfo.url === "string") {
      if (tabdata.has(t.id)) {
        let tmp = tabdata.get(t.id);
        tmp.url = changeInfo.url;
        tabdata.set(t.id, tmp);
      }
      delayed_updateBA();
    }
  },
  { properties: ["url"] }
);

// update cache
browser.tabs.onCreated.addListener((t) => {
  tabdata.set(t.id, {
    url: t.url,
    cs: t.cookieStoreId,
    lastAccessed: t.lastAccessed,
    created: Date.now(),
  });
  delayed_updateBA();
});

// update the lastAccessed timestamp
browser.tabs.onActivated.addListener((info) => {
  let tmp = tabdata.get(info.tabId);
  tmp.lastAccessed = Date.now();
  tabdata.set(info.tabId, tmp);
});

// remove tab from cache
browser.tabs.onRemoved.addListener((tabId) => {
  if (tabdata.has(tabId)) {
    tabdata.delete(tabId);
  }
  if (dupdata.has(tabId)) {
    dupdata.delete(tabId);
  }
  delayed_updateBA();
});

// tigger deletion
browser.browserAction.onClicked.addListener((tab) => {
  delDups(tab.id);
  browser.browserAction.disable(tab.id);
  browser.browserAction.setBadgeText({ tabId: tab.id, text: "" });
});
