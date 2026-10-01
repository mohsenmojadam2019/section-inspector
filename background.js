async function getActiveTab() {
  const tabs = await chrome.tabs.query({active:true,currentWindow:true});
  return tabs[0] || null;
}
function allowed(url) {
  return !/^(chrome|edge|about|chrome-extension|devtools):/i.test(url || "");
}
async function toggleInspector(tab) {
  if (!tab || !tab.id || !allowed(tab.url)) return;
  try {
    const state = await chrome.scripting.executeScript({
      target:{tabId:tab.id},
      func:() => Boolean(window.__SECTION_INSPECTOR_ACTIVE__)
    });
    const active = Boolean(state && state[0] && state[0].result);
    if (!active) {
      await chrome.scripting.executeScript({target:{tabId:tab.id},files:["inspector.js"]});
      await chrome.action.setBadgeBackgroundColor({tabId:tab.id,color:"#ff0012"});
      await chrome.action.setBadgeText({tabId:tab.id,text:"ON"});
      await chrome.action.setTitle({tabId:tab.id,title:"Section Inspector active"});
    } else {
      await chrome.scripting.executeScript({
        target:{tabId:tab.id},
        func:() => { if (window.__SECTION_INSPECTOR__) window.__SECTION_INSPECTOR__.destroy(); }
      });
      await chrome.action.setBadgeText({tabId:tab.id,text:""});
      await chrome.action.setTitle({tabId:tab.id,title:"Section Inspector"});
    }
  } catch (error) {
    console.warn("Section Inspector toggle failed", error);
  }
}
chrome.action.onClicked.addListener(toggleInspector);
chrome.commands.onCommand.addListener(async function(command) {
  if (command !== "toggle-inspector") return;
  await toggleInspector(await getActiveTab());
});
chrome.tabs.onUpdated.addListener(async function(tabId, changeInfo) {
  if (changeInfo.status === "loading") {
    try { await chrome.action.setBadgeText({tabId:tabId,text:""}); } catch (_) {}
  }
});
