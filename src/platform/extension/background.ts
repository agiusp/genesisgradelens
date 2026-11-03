// Toolbar button: open GenesisGradeLens in a tab, or focus it if it's already open.

chrome.action.onClicked.addListener(async () => {
  const appUrl = chrome.runtime.getURL('app.html');
  const [existing] = await chrome.tabs.query({ url: appUrl });
  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId !== undefined) await chrome.windows.update(existing.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: appUrl });
  }
});
