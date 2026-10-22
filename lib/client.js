window.__ModuleLoader__.load({ id: "dsh-agent-tool-filter", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/index.jsx
var index_exports = {};
__export(index_exports, {
  MatrixSection: () => MatrixSection,
  PacksSection: () => PacksSection,
  PresetCopyModal: () => PresetCopyModal,
  PresetRow: () => PresetRow,
  ProfileEditor: () => ProfileEditor,
  ProfilesSection: () => ProfilesSection,
  ScanSection: () => ScanSection,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");

// lib/i18n.mjs
var ru = {
  title: "\u0424\u0438\u043B\u044C\u0442\u0440\u0430\u0446\u0438\u044F \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432",
  summary: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0444\u0438\u043B\u044C\u0442\u0440\u0430\u0446\u0438\u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432",
  enabled: "\u0424\u0438\u043B\u044C\u0442\u0440\u0430\u0446\u0438\u044F \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0430",
  enabledDesc: "\u041C\u0430\u0441\u043A\u0430 \u043F\u0440\u0438\u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u043A \u043A\u043E\u0440\u043D\u0435\u0432\u044B\u043C \u0430\u0433\u0435\u043D\u0442\u0430\u043C \u043F\u043E \u0441\u0432\u044F\u0437\u043A\u0430\u043C \u043C\u0430\u0442\u0440\u0438\u0446\u044B.",
  statusLine: "\u0410\u0433\u0435\u043D\u0442\u043E\u0432 \u0441 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0439 \u043C\u0430\u0441\u043A\u043E\u0439: {agents} \xB7 \u0441\u043A\u0440\u044B\u0442\u043E \u0441\u0445\u0435\u043C: {hidden}",
  notLoaded: "\u0421\u0442\u0430\u0442\u0443\u0441 \u0435\u0449\u0451 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D",
  refresh: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C",
  loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026",
  error: "\u041E\u0448\u0438\u0431\u043A\u0430: {msg}",
  statusRefreshed: "\u0421\u0442\u0430\u0442\u0443\u0441 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D",
  statusSaved: "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E",
  langLabel: "\u042F\u0437\u044B\u043A \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430 \u043F\u043B\u0430\u0433\u0438\u043D\u0430",
  langDesc: "\xAB\u041A\u0430\u043A \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438\xBB \u2014 \u0430\u043A\u0442\u0438\u0432\u043D\u0430\u044F \u043B\u043E\u043A\u0430\u043B\u044C \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B; \u043C\u043E\u0436\u043D\u043E \u0437\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0440\u0443\u0441\u0441\u043A\u0438\u0439 \u0438\u043B\u0438 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439.",
  langAuto: "\u041A\u0430\u043A \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438",
  langRu: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
  langEn: "English",
  matrixTitle: "\u041C\u0430\u0442\u0440\u0438\u0446\u0430 \xAB\u043F\u0440\u0435\u0441\u0435\u0442 \u2192 \u043F\u0440\u043E\u0444\u0438\u043B\u044C\xBB",
  matrixIntro: "\u0423 \u043F\u0440\u0435\u0441\u0435\u0442\u0430 \u2014 \u0440\u043E\u0432\u043D\u043E \u043E\u0434\u0438\u043D \u043F\u0440\u043E\u0444\u0438\u043B\u044C; \u043E\u0434\u0438\u043D \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u043C\u043E\u0436\u043D\u043E \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C \u043A \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u043C \u043F\u0440\u0435\u0441\u0435\u0442\u0430\u043C. \xAB\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C\xBB \u0441\u043E\u0437\u0434\u0430\u0451\u0442 custom-\u043A\u043E\u043F\u0438\u044E \u043F\u0440\u0435\u0441\u0435\u0442\u0430, \u0441\u0432\u044F\u0437\u043A\u0443 \u0437\u0430\u0434\u0430\u0451\u0442\u0435 \u0432\u0442\u043E\u0440\u044B\u043C \u0448\u0430\u0433\u043E\u043C.",
  matrixEmpty: "\u041F\u0440\u0435\u0441\u0435\u0442\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B.",
  blockDefault: "\u0414\u0435\u0444\u043E\u043B\u0442\u043D\u044B\u0435 \u043F\u0440\u0435\u0441\u0435\u0442\u044B",
  blockCustom: "\u041A\u0430\u0441\u0442\u043E\u043C\u043D\u044B\u0435 \u043F\u0440\u0435\u0441\u0435\u0442\u044B",
  free: "\u0441\u0432\u043E\u0431\u043E\u0434\u0435\u043D",
  pickProfile: "\u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u2014",
  noProfile: "\u2014 \u0431\u0435\u0437 \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u2014",
  bind: "\u0421\u0432\u044F\u0437\u0430\u0442\u044C",
  replace: "\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u044C",
  unbind: "\u0421\u043D\u044F\u0442\u044C",
  copyPlaceholder: "\u0438\u043C\u044F \u043A\u043E\u043F\u0438\u0438 \u043F\u0440\u0435\u0441\u0435\u0442\u0430",
  copy: "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
  delete: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
  bindSaved: "\u0421\u0432\u044F\u0437\u043A\u0430 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430",
  unbindSaved: "\u0421\u0432\u044F\u0437\u043A\u0430 \u0441\u043D\u044F\u0442\u0430",
  copySaved: "\u041F\u0440\u0435\u0441\u0435\u0442 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D",
  presetDeleted: "\u041F\u0440\u0435\u0441\u0435\u0442 \u0443\u0434\u0430\u043B\u0451\u043D",
  profilesTitle: "\u041F\u0440\u043E\u0444\u0438\u043B\u0438",
  profilesEmpty: "\u041F\u0440\u043E\u0444\u0438\u043B\u0435\u0439 \u043D\u0435\u0442.",
  edit: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
  newProfilePlaceholder: "\u0438\u043C\u044F \u043D\u043E\u0432\u043E\u0433\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F",
  create: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u044C",
  profileSaved: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D",
  profileDeleted: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u0443\u0434\u0430\u043B\u0451\u043D/\u0441\u0431\u0440\u043E\u0448\u0435\u043D",
  editorNew: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C (\u043D\u043E\u0432\u044B\u0439)",
  nameLabel: "\u0418\u043C\u044F:",
  modeLabel: "\u0420\u0435\u0436\u0438\u043C:",
  modeDeny: "deny \u2014 \u0441\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435",
  modeAllow: "allow \u2014 \u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435",
  checkedDeny: "\u041E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u044B (\u0441\u043A\u0440\u044B\u0442\u044B)",
  checkedAllow: "\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u044B (\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B)",
  uncheckedDeny: "\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u044B, \u043D\u043E \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
  uncheckedAllow: "\u041E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u044B, \u043D\u043E \u043C\u043E\u0436\u043D\u043E \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
  lockedTitle: "\u041D\u0435 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u2014 \u0432\u0441\u0435\u0433\u0434\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B",
  lockedSelected: " \u2014 \u0432\u044B\u0431\u0440\u0430\u043D\u043E \u0432 \u043F\u0440\u043E\u0444\u0438\u043B\u0435, \u043D\u043E \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u0442\u0435\u043B\u044C \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u0442 \u043C\u0430\u0441\u043A\u0443 \u2014 \u0443\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u043C\u044F",
  lockedFixed: " \u2014 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u043D\u0435 \u0434\u0430\u0451\u0442 \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
  save: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
  saving: "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435\u2026",
  cancel: "\u041E\u0442\u043C\u0435\u043D\u0430",
  packsTitle: "\u041F\u0430\u043A\u0435\u0442\u044B-\u0448\u0430\u0431\u043B\u043E\u043D\u044B",
  packsIntro: "\u0418\u043C\u043F\u043E\u0440\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u0442 \u043F\u0440\u043E\u0444\u0438\u043B\u0438 \u043F\u0430\u043A\u0435\u0442\u0430 \u0432 \u0441\u043F\u0438\u0441\u043E\u043A; \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 \u0441 \u0442\u0435\u043C\u0438 \u0436\u0435 \u0438\u043C\u0435\u043D\u0430\u043C\u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u044E\u0442\u0441\u044F.",
  import: "\u0418\u043C\u043F\u043E\u0440\u0442",
  importSaved: "\u041F\u0430\u043A\u0435\u0442 \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D",
  scanTitle: "\u0421\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 tools",
  scanPending: "\u0414\u0430\u043D\u043D\u044B\u0435 \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u044E\u0442\u0441\u044F \u0432\u043C\u0435\u0441\u0442\u0435 \u0441\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u043E\u043C.",
  scanCanDisable: "{n} tools \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
  scanCannotDisable: "{n} tools \u043D\u0435\u043B\u044C\u0437\u044F \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
  scanUnavailable: "\u0441\u043A\u0430\u043D \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D: \u0440\u0435\u0435\u0441\u0442\u0440 tools \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
  warningsTitle: "\u041F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u044F",
  copyTitle: "\u041A\u043E\u043F\u0438\u044F \u043F\u0440\u0435\u0441\u0435\u0442\u0430 {name}",
  copyNameLabel: "\u0418\u043C\u044F \u043A\u043E\u043F\u0438\u0438",
  copyNameDesc: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0441\u043E\u0437\u0434\u0430\u0441\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438.",
  copyPreview: "\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F:",
  createShort: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C",
  copyProfileTitle: "\u041A\u043E\u043F\u0438\u044F \u043F\u0440\u043E\u0444\u0438\u043B\u044F {name}",
  editProfileTitle: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C {name}",
  close: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
  diagTitle: "\u0414\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0430",
  diagShow: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C",
  diagHide: "\u0421\u043A\u0440\u044B\u0442\u044C",
  diagDesc: "\u0420\u0430\u0441\u043A\u0440\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043F\u043E \u043A\u043B\u0438\u043A\u0443; \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043D\u0435 \u0437\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u0435\u0442\u0441\u044F.",
  diagRemote: "remote-\u043C\u043E\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
  diagNamespace: "namespace",
  diagLocale: "locale",
  diagLang: "\u044F\u0437\u044B\u043A UI",
  diagVersion: "\u0432\u0435\u0440\u0441\u0438\u044F \u043F\u043B\u0430\u0433\u0438\u043D\u0430"
};
var en = {
  title: "Tool filtering",
  summary: "Tool filtering settings",
  enabled: "Filtering enabled",
  enabledDesc: "The mask applies to root agents via matrix bindings.",
  statusLine: "Agents with an active mask: {agents} \xB7 hidden schemas: {hidden}",
  notLoaded: "Status not loaded yet",
  refresh: "Refresh",
  loading: "Loading\u2026",
  error: "Error: {msg}",
  statusRefreshed: "Status refreshed",
  statusSaved: "Saved",
  langLabel: "Plugin UI language",
  langDesc: "\u201CSame as app\u201D follows the platform locale; you can pin Russian or English.",
  langAuto: "Same as app",
  langRu: "Russian",
  langEn: "English",
  matrixTitle: "Preset \u2192 profile matrix",
  matrixIntro: "A preset has exactly one profile; one profile can serve several presets. \u201CCopy\u201D creates a custom preset copy \u2014 set its binding as a second step.",
  matrixEmpty: "No presets found.",
  blockDefault: "Built-in presets",
  blockCustom: "Custom presets",
  free: "unbound",
  pickProfile: "\u2014 select a profile \u2014",
  noProfile: "\u2014 no profile \u2014",
  bind: "Bind",
  replace: "Replace",
  unbind: "Unbind",
  copyPlaceholder: "preset copy name",
  copy: "Copy",
  delete: "Delete",
  bindSaved: "Binding added",
  unbindSaved: "Binding removed",
  copySaved: "Preset copied",
  presetDeleted: "Preset deleted",
  profilesTitle: "Profiles",
  profilesEmpty: "No profiles.",
  edit: "Edit",
  newProfilePlaceholder: "new profile name",
  create: "Create profile",
  profileSaved: "Profile saved",
  profileDeleted: "Profile deleted/reset",
  editorNew: "Profile (new)",
  nameLabel: "Name:",
  modeLabel: "Mode:",
  modeDeny: "deny \u2014 hide selected",
  modeAllow: "allow \u2014 keep only selected",
  checkedDeny: "Disabled (hidden)",
  checkedAllow: "Enabled (available)",
  uncheckedDeny: "Enabled, can be disabled",
  uncheckedAllow: "Disabled, can be enabled",
  lockedTitle: "Not controllable \u2014 always available",
  lockedSelected: " \u2014 selected in the profile but the limiter rejects the mask \u2014 remove the name",
  lockedFixed: " \u2014 the platform does not allow disabling it",
  save: "Save",
  saving: "Saving\u2026",
  cancel: "Cancel",
  packsTitle: "Template packs",
  packsIntro: "Import adds the pack profiles to the list; existing profiles with the same names are overwritten.",
  import: "Import",
  importSaved: "Pack imported",
  scanTitle: "Tool scan",
  scanPending: "Scan data loads together with the status.",
  scanCanDisable: "{n} tools can be disabled",
  scanCannotDisable: "{n} tools cannot be disabled",
  scanUnavailable: "scan not performed: tool registry unavailable",
  warningsTitle: "Warnings",
  copyTitle: "Copy preset {name}",
  copyNameLabel: "Copy name",
  copyNameDesc: "The description is generated automatically.",
  copyPreview: "Description preview:",
  createShort: "Create",
  copyProfileTitle: "Copy profile {name}",
  editProfileTitle: "Profile {name}",
  close: "Close",
  diagTitle: "Diagnostics",
  diagShow: "Show",
  diagHide: "Hide",
  diagDesc: "Expands on click; the state is not persisted.",
  diagRemote: "remote mount",
  diagNamespace: "namespace",
  diagLocale: "locale",
  diagLang: "UI language",
  diagVersion: "plugin version"
};
var DICTS = { ru, en };
function resolveLang(language, platformLang2) {
  if (language === "ru" || language === "en") return language;
  return typeof platformLang2 === "string" && platformLang2.toLowerCase().startsWith("ru") ? "ru" : "en";
}
function makeT(lang) {
  const dict = DICTS[lang] ?? en;
  return (key, params) => {
    const template = dict[key] ?? en[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match);
  };
}

// lib/preset-display.mjs
var BUILT_IN_KEY_MAP = {
  standard: { name: "presetStandardName", description: "presetStandardDescription" },
  ptc: { name: "presetPtcName", description: "presetPtcDescription" },
  minimal: { name: "presetMinimalName", description: "presetMinimalDescription" },
  cordis: { name: "presetCordisName", description: "presetCordisDescription" }
};
function translateText(t) {
  return (key) => {
    const value = t(key);
    return typeof value === "string" && value !== key ? value : void 0;
  };
}
function builtInTexts(t, presetId, info) {
  if (typeof t !== "function") return void 0;
  const keys = BUILT_IN_KEY_MAP[presetId];
  if (keys === void 0) return void 0;
  const published = typeof info?.name === "string" && info.name !== "" && info.name !== presetId;
  if (published) return void 0;
  return { keys, text: translateText(t) };
}
function resolvePresetDisplay(t, presetId, info) {
  const builtIn = builtInTexts(t, presetId, info);
  if (builtIn === void 0) return void 0;
  const { keys, text } = builtIn;
  const name = text(keys.name);
  const description = text(keys.description);
  if (name === void 0 && description === void 0) return void 0;
  return {
    ...name === void 0 ? {} : { name },
    ...description === void 0 ? {} : { description }
  };
}
function resolveCopyDisplay(t, presetId, info) {
  const fromDictionary = resolvePresetDisplay(t, presetId, info);
  if (fromDictionary !== void 0) return fromDictionary;
  const name = typeof info?.name === "string" && info.name.trim() !== "" && info.name !== presetId ? info.name : void 0;
  const description = typeof info?.description === "string" && info.description.trim() !== "" ? info.description : void 0;
  if (name === void 0 && description === void 0) return void 0;
  return {
    ...name === void 0 ? {} : { name },
    ...description === void 0 ? {} : { description }
  };
}

// lib/remote-descriptors.mjs
var SRC_JSON = Object.freeze({ mode: "src-json" });
function strictCodec(typeName, parse) {
  return Object.freeze({
    mode: "strict",
    typeSymbol: `dsh-agent-tool-filter#${typeName}`,
    create: () => Object.freeze({ parse })
  });
}
var STRING = strictCodec("String", (value) => {
  if (typeof value !== "string") throw new TypeError("expected a string");
  return value;
});
var BOOLEAN = strictCodec("Boolean", (value) => {
  if (typeof value !== "boolean") throw new TypeError("expected a boolean");
  return value;
});
var PROFILE_INPUT = strictCodec("ProfileInput", (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("expected a profile object");
  }
  if (value.mode !== "deny" && value.mode !== "allow") {
    throw new TypeError('mode must be "deny" or "allow"');
  }
  if (!Array.isArray(value.tools) || !value.tools.every((tool) => typeof tool === "string")) {
    throw new TypeError("tools must be an array of strings");
  }
  return value;
});
var DISPLAY_INPUT = strictCodec("DisplayInput", (value) => {
  if (value === void 0 || value === null) return void 0;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("expected a display object");
  }
  for (const key of ["name", "description"]) {
    const item = value[key];
    if (item !== void 0 && typeof item !== "string") {
      throw new TypeError(`display.${key} must be a string`);
    }
  }
  return value;
});
var LANGUAGE_INPUT = strictCodec("LanguageInput", (value) => {
  if (value !== "auto" && value !== "ru" && value !== "en") {
    throw new TypeError('language must be "auto", "ru" or "en"');
  }
  return value;
});
function parameter(name, codec = STRING, options = {}) {
  return Object.freeze({
    name,
    wire: name,
    source: "json",
    codec,
    // Штатная опциональность gateway: поле можно опустить (строгий codec
    // возвращает undefined — см. decode() в api/gateway).
    ...options.optional === true ? { acceptsUndefined: true } : {}
  });
}
function descriptor(method, parameters = []) {
  return Object.freeze({
    id: `dsh-agent-tool-filter#agentToolFilter/${method}`,
    service: "agentToolFilter",
    namespace: "agentToolFilter",
    method,
    invocation: Object.freeze({ kind: "direct" }),
    parameters: Object.freeze(parameters),
    result: SRC_JSON
  });
}
var remoteDescriptors = Object.freeze([
  descriptor("setEnabled", [parameter("enabled", BOOLEAN)]),
  descriptor("setLanguage", [parameter("language", LANGUAGE_INPUT)]),
  descriptor("bindPreset", [parameter("presetId"), parameter("profileName")]),
  descriptor("unbindPreset", [parameter("presetId")]),
  descriptor("setProfile", [parameter("name"), parameter("profile", PROFILE_INPUT)]),
  descriptor("deleteProfile", [parameter("name")]),
  descriptor("importPack", [parameter("packId")]),
  descriptor("copyPreset", [parameter("presetId"), parameter("newName"), parameter("display", DISPLAY_INPUT, { optional: true })]),
  descriptor("deletePreset", [parameter("presetId")]),
  descriptor("rescan")
]);
var statusDescriptor = descriptor("status");
var clientDescriptors = Object.freeze([statusDescriptor, ...remoteDescriptors]);

// client/index.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var PACKAGE_NAME = "dsh-agent-tool-filter";
var SLOT_KEY = `${PACKAGE_NAME}#agent-tool-filter`;
var serviceRef = void 0;
var remoteMounted = false;
var presetTranslate = void 0;
var localeFaceRef = void 0;
var lastLanguage = "auto";
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
async function callRemote(service, method, ...args) {
  if (!service || typeof service[method] !== "function") {
    throw new Error(`Remote-\u0441\u0435\u0440\u0432\u0438\u0441 agentToolFilter \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D (\u0432\u044B\u0437\u043E\u0432 ${method})`);
  }
  const result = await service[method](...args);
  if (result?.ok !== true) {
    const error = result?.error;
    throw new Error(error?.message ?? String(error ?? "Remote \u0432\u044B\u0437\u043E\u0432 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u043E\u0448\u0438\u0431\u043A\u043E\u0439"));
  }
  const value = result.value;
  if (value?.ok === false) throw new Error(value.error ?? "\u041E\u043F\u0435\u0440\u0430\u0446\u0438\u044F \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430 host-\u0441\u0435\u0440\u0432\u0438\u0441\u043E\u043C");
  return value;
}
function platformLang() {
  try {
    return localeFaceRef?.getSnapshot?.().active ?? localeFaceRef?.snapshot?.active;
  } catch {
  }
  return void 0;
}
var STYLE_ID = "dsh-agent-tool-filter-styles";
var CSS = `
.atf-card { display: flex; flex-direction: column; gap: 16px; max-width: 760px; font: 400 14px/22px var(--dsw-font-family, system-ui, sans-serif); color: var(--dsw-alias-label-primary, rgb(249,250,251)); }
.atf-group { background: var(--dsw-alias-bg-layer-3, rgb(53,54,56)); border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-lg, 16px); padding: 20px; display: flex; flex-direction: column; gap: 8px; }
.atf-group-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.atf-group-title { font-size: 13px; line-height: 20px; font-weight: 600; margin: 0; }
.atf-sub { font-size: 13px; line-height: 20px; font-weight: 600; margin: 8px 0 0; display: flex; align-items: center; gap: 8px; }
.atf-counter { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); background: rgba(255,255,255,0.08); border-radius: 999px; padding: 1px 8px; }
.atf-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 2px; border-top: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); flex-wrap: wrap; }
.atf-row:first-of-type { border-top: none; }
.atf-row-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.atf-row-label { font-size: 14px; line-height: 22px; font-weight: 500; }
.atf-row-desc { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-btn { font: 500 13px/20px var(--dsw-font-family, system-ui, sans-serif); border-radius: var(--dsw-radius-sm, 8px); cursor: pointer; border: 1px solid transparent; padding: 0 14px; height: 36px; color: var(--dsw-alias-label-primary, rgb(249,250,251)); background: none; transition: background 0.15s, border-color 0.15s, color 0.15s; }
.atf-btn.atf-sm { height: 28px; padding: 0 10px; font-size: 12px; }
.atf-btn.atf-primary { background: var(--dsw-alias-button-primary-fill, rgb(122,170,255)); color: rgb(15,17,21); font-weight: 600; }
.atf-btn.atf-primary:hover { filter: brightness(1.08); }
.atf-btn.atf-outline { border-color: var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); }
.atf-btn.atf-outline:hover { border-color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); }
.atf-btn.atf-ghost:hover { background: rgba(255,255,255,0.08); }
.atf-btn.atf-danger { border-color: rgba(242,90,90,0.5); color: var(--dsw-alias-state-error-primary, rgb(242,90,90)); }
.atf-btn.atf-danger:hover { background: rgba(242,90,90,0.12); }
.atf-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.atf-btn:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, rgb(122,170,255)); outline-offset: 2px; }
.atf-btns { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.atf-switch { width: 36px; height: 20px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); background: rgba(255,255,255,0.1); position: relative; cursor: pointer; flex: none; transition: background 0.15s, border-color 0.15s; }
.atf-switch .atf-thumb { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--dsw-alias-label-primary, rgb(249,250,251)); transition: left 0.15s; }
.atf-switch[aria-checked="true"] { background: var(--dsw-alias-button-primary-fill, rgb(122,170,255)); border-color: var(--dsw-alias-button-primary-fill, rgb(122,170,255)); }
.atf-switch[aria-checked="true"] .atf-thumb { left: 18px; background: rgb(15,17,21); }
.atf-switch:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, rgb(122,170,255)); outline-offset: 2px; }
.atf-switch.atf-mini { width: 30px; height: 16px; }
.atf-switch.atf-mini .atf-thumb { width: 10px; height: 10px; }
.atf-switch.atf-mini[aria-checked="true"] .atf-thumb { left: 16px; }
@media (prefers-reduced-motion: reduce) { .atf-card * { transition: none !important; } }
.atf-pill-wrap { position: relative; display: inline-flex; }
.atf-pill { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-md, 12px); cursor: pointer; font-size: 13px; line-height: 20px; background: rgba(255,255,255,0.04); color: var(--dsw-alias-label-primary, rgb(249,250,251)); }
.atf-pill:hover { border-color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); }
.atf-pill.atf-pill-sm { height: 28px; border-radius: var(--dsw-radius-sm, 8px); font-size: 12px; padding: 0 10px; }
.atf-pill.atf-placeholder { color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-chevron { color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); font-size: 10px; }
.atf-pill-menu { position: absolute; top: calc(100% + 4px); left: 0; min-width: 100%; margin: 0; padding: 4px; list-style: none; background: var(--dsw-alias-bg-layer-3, rgb(53,54,56)); border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-sm, 8px); z-index: 50; max-height: 240px; overflow: auto; }
.atf-pill-item { padding: 6px 10px; border-radius: var(--dsw-radius-xs, 4px); cursor: pointer; font-size: 13px; white-space: nowrap; }
.atf-pill-item:hover { background: rgba(255,255,255,0.08); }
.atf-pill-item[aria-selected="true"] { color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); }
.atf-input { height: 36px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-sm, 8px); background: rgba(255,255,255,0.04); color: var(--dsw-alias-label-primary, rgb(249,250,251)); font: 400 13px/20px var(--dsw-font-family, system-ui, sans-serif); padding: 0 10px; }
.atf-input.atf-text { width: 200px; }
.atf-input.atf-num { width: 76px; text-align: right; }
.atf-input.atf-sm { height: 28px; font-size: 12px; }
.atf-input:focus { outline: none; border-color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); }
.atf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.atf-item { min-height: 106px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-md, 12px); padding: 12px; display: flex; flex-direction: column; gap: 8px; background: rgba(255,255,255,0.03); }
.atf-item.atf-active { border-color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); background: rgba(122,170,255,0.14); }
.atf-item-head { display: flex; align-items: center; gap: 8px; }
.atf-icon-chip { width: 28px; height: 28px; border-radius: var(--dsw-radius-sm, 8px); flex: none; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; }
.atf-item-title { font-size: 13px; line-height: 20px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.atf-item-desc { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.atf-item-foot { margin: auto -12px -12px; padding: 8px 12px; border-top: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); display: flex; gap: 12px; border-radius: 0 0 var(--dsw-radius-md, 12px) var(--dsw-radius-md, 12px); }
.atf-link { background: none; border: none; padding: 0; font: inherit; color: inherit; cursor: pointer; }
.atf-link:hover { color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); }
.atf-mrow { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 12px 2px; border-top: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); font-size: 13px; }
.atf-mrow:first-of-type { border-top: none; }
.atf-code { font: 400 12px/18px var(--ds-font-family-code, ui-monospace, Consolas, monospace); background: rgba(255,255,255,0.08); border-radius: var(--dsw-radius-xs, 4px); padding: 1px 6px; }
.atf-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; line-height: 16px; border-radius: 999px; padding: 1px 8px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-tag.atf-accent { color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); border-color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); }
.atf-tag.atf-success { color: var(--dsw-alias-state-success-primary, rgb(34,197,94)); border-color: rgba(34,197,94,0.5); }
.atf-tag.atf-warning { color: var(--dsw-static-amber-400, rgb(247,173,49)); border-color: rgba(247,173,49,0.5); }
.atf-tag.atf-danger { color: var(--dsw-alias-state-error-primary, rgb(242,90,90)); border-color: rgba(242,90,90,0.5); }
.atf-chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.atf-chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 6px 0 10px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-xs, 4px); font-size: 12px; }
.atf-chip button { border: none; background: none; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); cursor: pointer; font-size: 14px; line-height: 1; padding: 2px 4px; border-radius: var(--dsw-radius-xs, 4px); }
.atf-chip button:hover { color: var(--dsw-alias-state-error-primary, rgb(242,90,90)); background: rgba(242,90,90,0.12); }
.atf-check { display: flex; align-items: center; gap: 8px; padding: 6px 2px; font-size: 13px; line-height: 20px; }
.atf-check .atf-locked { color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-report { font: 400 12px/18px var(--ds-font-family-code, ui-monospace, Consolas, monospace); background: rgba(255,255,255,0.04); border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-md, 12px); padding: 12px; display: flex; flex-direction: column; gap: 4px; white-space: pre-wrap; }
.atf-muted { color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-alert { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border: 1px solid rgba(242,90,90,0.5); background: rgba(242,90,90,0.1); border-radius: var(--dsw-radius-sm, 8px); font-size: 12px; line-height: 18px; }
.atf-status { font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-success-primary, rgb(34,197,94)); }
.atf-statusbar { min-height: 20px; display: flex; align-items: center; }
.atf-status.atf-loading { color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-status.atf-error { color: var(--dsw-alias-state-error-primary, rgb(242,90,90)); }
.atf-empty { padding: 16px; text-align: center; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); font-size: 12px; line-height: 18px; border: 1px dashed var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-md, 12px); }
.atf-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.atf-modal { background: var(--dsw-alias-bg-base, rgb(21,21,23)); color: var(--dsw-alias-label-primary, rgb(249,250,251)); border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-lg, 16px); width: min(460px, 92vw); max-height: 80vh; overflow: auto; display: flex; flex-direction: column; }
.atf-modal-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); font-size: 14px; line-height: 22px; }
.atf-modal-body { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.atf-modal-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); }
.atf-link.atf-link-danger { color: var(--dsw-alias-state-error-primary, rgb(242,90,90)); }
`;
function ensureStyles() {
  try {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  } catch {
  }
}
function StatusBar({ flash, section }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-statusbar", children: flash === null || flash.section !== section ? null : flash.kind === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-status atf-error", role: "alert", children: flash.text }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `atf-status${flash.kind === "loading" ? " atf-loading" : ""}`, role: "status", children: flash.text }) });
}
function Switch({ checked, onChange, label, mini, disabled }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": checked,
      "aria-label": label,
      disabled,
      className: `atf-switch${mini ? " atf-mini" : ""}`,
      onClick: () => onChange(!checked),
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-thumb" })
    }
  );
}
function PillSelect({ value, options, onChange, disabled, small, placeholder }) {
  const [open, setOpen] = (0, import_react.useState)(false);
  const ref = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (!open) return void 0;
    const onDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const current = options.find((option) => option.value === value);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "atf-pill-wrap", ref, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        className: `atf-pill${small ? " atf-pill-sm" : ""}${current === void 0 ? " atf-placeholder" : ""}`,
        disabled,
        "aria-haspopup": "listbox",
        "aria-expanded": open,
        onClick: () => setOpen((previous) => !previous),
        children: [
          current?.label ?? placeholder,
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-chevron", children: "\u25BC" })
        ]
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "atf-pill-menu", role: "listbox", children: options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "li",
      {
        role: "option",
        "aria-selected": option.value === value,
        className: "atf-pill-item",
        onClick: () => {
          onChange(option.value);
          setOpen(false);
        },
        children: option.label
      },
      option.value
    )) })
  ] });
}
function Modal({ title, onClose, children, footer }) {
  (0, import_react.useEffect)(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-overlay", role: "presentation", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: "atf-modal",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": typeof title === "string" ? title : void 0,
      onClick: (event) => event.stopPropagation(),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-modal-head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-btn atf-ghost atf-sm", onClick: onClose, children: "\xD7" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-modal-body", children }),
        footer && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-modal-foot", children: footer })
      ]
    }
  ) });
}
function PresetCopyModal({ preset, info, t, onCancel, onConfirm }) {
  const [name, setName] = (0, import_react.useState)("");
  const display = resolveCopyDisplay(presetTranslate, preset, info);
  const title = display?.name ?? info?.name ?? preset;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    Modal,
    {
      title: t("copyTitle", { name: title }),
      onClose: onCancel,
      footer: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-btn atf-primary", disabled: name.trim() === "", onClick: () => onConfirm(name.trim()), children: t("createShort") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-btn atf-ghost", onClick: onCancel, children: t("cancel") })
      ] }),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-row", style: { borderTop: "none" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-row-text", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-row-label", children: t("copyNameLabel") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-row-desc", children: t("copyNameDesc") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "atf-input atf-text", type: "text", value: name, "aria-label": t("copyNameLabel"), onChange: (event) => setName(event.target.value), autoFocus: true })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-row-desc", children: t("copyPreview") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-report", children: [
          t("copyTitle", { name: title }),
          display?.description ? `
${display.description}` : ""
        ] })
      ]
    }
  );
}
function PresetRow({ preset, bound, info, profileNames, busy, t, onBind, onUnbind, onCopyRequest, onDeletePreset }) {
  const [profileName, setProfileName] = (0, import_react.useState)(bound ?? "");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `atf-item${bound !== void 0 ? " atf-active" : ""}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-item-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: "atf-code", children: preset }),
      bound === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-tag", children: t("free") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "atf-tag atf-accent", children: [
        "\u2192 ",
        bound
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-btns", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        PillSelect,
        {
          small: true,
          value: profileName === "" ? void 0 : profileName,
          placeholder: bound === void 0 ? t("pickProfile") : t("noProfile"),
          options: profileNames.map((name) => ({ value: name, label: name })),
          onChange: setProfileName,
          disabled: busy || profileNames.length === 0
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-btn atf-primary atf-sm", disabled: busy || profileName === "", onClick: () => onBind(preset, profileName), children: bound === void 0 ? t("bind") : t("replace") }),
      bound !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-btn atf-ghost atf-sm", disabled: busy, onClick: () => onUnbind(preset), children: t("unbind") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-item-foot", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-link", disabled: busy, onClick: () => onCopyRequest(preset), children: t("copy") }),
      info?.deletable === true && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-link atf-link-danger", disabled: busy, onClick: () => onDeletePreset(preset), children: t("delete") })
    ] })
  ] });
}
function MatrixSection({ status, busy, t = makeT("en"), onBind, onUnbind, onCopyPreset, onDeletePreset }) {
  const matrix = status?.presets ?? {};
  const profileNames = Object.keys(status?.profiles ?? {});
  const allPresets = [.../* @__PURE__ */ new Set([...status?.presetIds ?? [], ...Object.keys(matrix)])];
  const [copyFor, setCopyFor] = (0, import_react.useState)(null);
  const byAlphabet = (a, b) => a.localeCompare(b, "ru");
  const isCustom = (preset) => status?.presetInfo?.[preset]?.deletable === true;
  const defaultPresets = allPresets.filter((preset) => !isCustom(preset)).sort(byAlphabet);
  const customPresets = allPresets.filter(isCustom).sort(byAlphabet);
  const renderRow = (preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    PresetRow,
    {
      preset,
      bound: matrix[preset],
      info: status?.presetInfo?.[preset],
      profileNames,
      busy,
      t,
      onBind,
      onUnbind,
      onCopyRequest: setCopyFor,
      onDeletePreset
    },
    preset
  );
  const renderBlock = (title, list) => list.length === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "atf-group", "aria-label": title, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-group-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "atf-group-title", children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-counter", children: list.length })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-grid", children: list.map(renderRow) })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-card", "aria-label": t("matrixTitle"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "atf-group-title", children: t("matrixTitle") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "atf-row-desc", children: t("matrixIntro") }),
    allPresets.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-empty", children: t("matrixEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      renderBlock(t("blockDefault"), defaultPresets),
      renderBlock(t("blockCustom"), customPresets)
    ] }),
    copyFor !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      PresetCopyModal,
      {
        preset: copyFor,
        info: status?.presetInfo?.[copyFor],
        t,
        onCancel: () => setCopyFor(null),
        onConfirm: (name) => {
          onCopyPreset(copyFor, name);
          setCopyFor(null);
        }
      }
    )
  ] });
}
function ProfileEditor({ name, profile, controllableTools, lockedTools, busy, isNew = false, kind, t = makeT("en"), onSave, onCancel }) {
  const [nameValue, setNameValue] = (0, import_react.useState)(name);
  const [mode, setMode] = (0, import_react.useState)(profile.mode);
  const [selected, setSelected] = (0, import_react.useState)(() => new Set(profile.tools));
  const controllable = new Set(controllableTools ?? []);
  const [order] = (0, import_react.useState)(() => [...controllable].sort());
  const [lockedList] = (0, import_react.useState)(() => [.../* @__PURE__ */ new Set([
    ...lockedTools ?? [],
    ...profile.tools.filter((tool) => !controllable.has(tool))
  ])].sort());
  const checkedList = order.filter((tool) => selected.has(tool));
  const uncheckedList = order.filter((tool) => !selected.has(tool));
  const toggle = (tool) => setSelected((previous) => {
    const next = new Set(previous);
    if (next.has(tool)) next.delete(tool);
    else next.add(tool);
    return next;
  });
  const toolRow = (tool) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "atf-check", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: selected.has(tool), onChange: () => toggle(tool) }),
    " ",
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: "atf-code", children: tool })
  ] }, tool);
  const editKind = kind ?? (isNew ? "create" : "edit");
  const nameEditable = editKind !== "edit" || isNew;
  const title = editKind === "create" ? t("editorNew") : editKind === "copy" ? t("copyProfileTitle", { name }) : t("editProfileTitle", { name });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, { title, onClose: onCancel, footer: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-btn atf-primary", disabled: busy || nameEditable && nameValue.trim() === "", onClick: () => onSave(nameEditable ? nameValue.trim() : name, { mode, tools: [...selected] }), children: busy ? t("saving") : t("save") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-btn atf-ghost", disabled: busy, onClick: onCancel, children: t("cancel") })
  ] }), children: [
    nameEditable && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-row-text", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-row-label", children: t("nameLabel") }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "atf-input atf-text", type: "text", value: nameValue, "aria-label": t("nameLabel"), onChange: (event) => setNameValue(event.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-row-text", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-row-label", children: t("modeLabel") }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        PillSelect,
        {
          value: mode,
          options: [{ value: "deny", label: t("modeDeny") }, { value: "allow", label: t("modeAllow") }],
          onChange: setMode,
          disabled: busy
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h5", { className: "atf-sub", children: [
      mode === "deny" ? t("checkedDeny") : t("checkedAllow"),
      " \u2014 ",
      checkedList.length
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: checkedList.map(toolRow) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h5", { className: "atf-sub", children: [
      mode === "deny" ? t("uncheckedDeny") : t("uncheckedAllow"),
      " \u2014 ",
      uncheckedList.length
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: uncheckedList.map(toolRow) }),
    lockedList.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h5", { className: "atf-sub", children: t("lockedTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: lockedList.map((tool) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-check", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: "atf-code", children: tool }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-locked", children: selected.has(tool) ? t("lockedSelected") : t("lockedFixed") })
      ] }, tool)) })
    ] })
  ] });
}
function ProfilesSection({ status, busy, editing, t = makeT("en"), onEdit, onCopy, onCancel, onSave, onDelete }) {
  const profiles = status?.profiles ?? {};
  const names = Object.keys(profiles);
  const groups = status?.report?.groups;
  const controllableTools = groups?.controllable ?? status?.tools ?? [];
  const lockedTools = groups?.locked ?? status?.lockedTools ?? [];
  const [newName, setNewName] = (0, import_react.useState)("");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "atf-group", "aria-label": t("profilesTitle"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-group-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "atf-group-title", children: t("profilesTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-counter", children: names.length })
    ] }),
    names.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-empty", children: t("profilesEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-grid", children: names.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `atf-item${editing?.name === name ? " atf-active" : ""}`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-item-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-icon-chip", children: name.slice(0, 1).toUpperCase() }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-item-title", children: name })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-item-desc", children: [
        profiles[name].mode,
        " \xB7 tools: ",
        profiles[name].tools.length
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-item-foot", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-link", disabled: busy || editing !== null, onClick: () => onEdit(name, profiles[name]), children: t("edit") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-link", disabled: busy || editing !== null, onClick: () => onCopy(name), children: t("copy") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-link", disabled: busy || editing !== null, onClick: () => onDelete(name), children: t("delete") })
      ] })
    ] }, name)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-btns", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          className: "atf-input atf-text",
          type: "text",
          value: newName,
          placeholder: t("newProfilePlaceholder"),
          "aria-label": t("newProfilePlaceholder"),
          onChange: (event) => setNewName(event.target.value),
          disabled: busy || editing !== null
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-btn atf-outline", disabled: busy || editing !== null || newName.trim() === "", onClick: () => onEdit(newName.trim(), null), children: t("create") })
    ] }),
    editing !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ProfileEditor,
      {
        name: editing.name,
        profile: editing.profile ?? { mode: "deny", tools: [] },
        isNew: profiles[editing.name] === void 0,
        kind: editing.kind ?? (editing.profile === null ? "create" : "edit"),
        controllableTools,
        lockedTools,
        busy,
        t,
        onSave,
        onCancel
      },
      editing.name
    )
  ] });
}
function PacksSection({ packs, busy, t = makeT("en"), onImport }) {
  if (!Array.isArray(packs) || packs.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "atf-group", "aria-label": t("packsTitle"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-group-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "atf-group-title", children: t("packsTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-counter", children: packs.length })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "atf-row-desc", children: t("packsIntro") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-grid", children: packs.map((pack) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-item", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-item-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-icon-chip", children: "\u2193" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-item-title", children: pack.title })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-item-desc", children: [
        pack.description,
        " (",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: "atf-code", children: pack.profiles.join(", ") }),
        ")"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-item-foot", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-link", disabled: busy, onClick: () => onImport(pack.id), children: t("import") }) })
    ] }, pack.id)) })
  ] });
}
function ScanSection({ report, t = makeT("en") }) {
  const controllable = report?.groups?.controllable ?? [];
  const locked = report?.groups?.locked ?? [];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "atf-group", "aria-label": t("scanTitle"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-group-head", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "atf-group-title", children: t("scanTitle") }) }),
    report == null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-empty", children: t("scanPending") }) : report.available === false ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-empty", children: t("scanUnavailable") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-report", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        "\u2705 ",
        t("scanCanDisable", { n: controllable.length })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        "\u26A0 ",
        t("scanCannotDisable", { n: locked.length })
      ] })
    ] })
  ] });
}
function AgentToolFilterCard({ service }) {
  const [status, setStatus] = (0, import_react.useState)(null);
  const [editing, setEditing] = (0, import_react.useState)(null);
  const [showDiag, setShowDiag] = (0, import_react.useState)(false);
  const [flash, setFlash] = (0, import_react.useState)(null);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const flashTimer = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => () => clearTimeout(flashTimer.current), []);
  const runAction = async (action, savedText, section, onSuccess) => {
    clearTimeout(flashTimer.current);
    setBusy(true);
    setFlash({ kind: "loading", text: t("loading"), section });
    try {
      const value = await action();
      onSuccess?.(value);
      setBusy(false);
      setFlash({ kind: "saved", text: savedText, section });
      flashTimer.current = setTimeout(() => setFlash(null), 4e3);
      return value;
    } catch (error) {
      setBusy(false);
      setFlash({ kind: "error", text: messageOf(error), section });
      flashTimer.current = setTimeout(() => setFlash(null), 12e3);
      return void 0;
    }
  };
  const applyStatus = (value) => {
    if (value?.status) setStatus(value.status);
  };
  const langSetting = status?.language ?? "auto";
  lastLanguage = langSetting;
  const t = makeT(resolveLang(langSetting, platformLang()));
  const refresh = () => runAction(
    () => callRemote(service, "status"),
    t("statusRefreshed"),
    "header",
    setStatus
  );
  (0, import_react.useEffect)(() => {
    void refresh();
  }, []);
  const setEnabled = (next) => runAction(
    () => callRemote(service, "setEnabled", next),
    t("statusSaved"),
    "header",
    applyStatus
  );
  const changeLanguage = (language) => runAction(
    () => callRemote(service, "setLanguage", language),
    t("statusSaved"),
    "header",
    applyStatus
  );
  const bind = (presetId, profileName) => runAction(
    () => callRemote(service, "bindPreset", presetId, profileName),
    t("bindSaved"),
    "matrix",
    applyStatus
  );
  const unbind = (presetId) => runAction(
    () => callRemote(service, "unbindPreset", presetId),
    t("unbindSaved"),
    "matrix",
    applyStatus
  );
  const saveProfile = (name, profile) => runAction(
    () => callRemote(service, "setProfile", name, profile),
    t("profileSaved"),
    "profiles",
    (value) => {
      applyStatus(value);
      setEditing(null);
    }
  );
  const deleteProfile = (name) => runAction(
    () => callRemote(service, "deleteProfile", name),
    t("profileDeleted"),
    "profiles",
    (value) => {
      applyStatus(value);
      setEditing(null);
    }
  );
  const editProfile = (name, profile) => {
    setEditing({ name, profile, kind: profile === null ? "create" : "edit" });
  };
  const copyProfile = (name) => {
    const source = status?.profiles?.[name];
    setEditing({
      name: `${name}-copy`,
      profile: source ? { mode: source.mode, tools: [...source.tools] } : null,
      kind: "copy"
    });
  };
  const importProfilePack = (packId) => runAction(
    () => callRemote(service, "importPack", packId),
    t("importSaved"),
    "packs",
    applyStatus
  );
  const copyPresetCall = (presetId, newName) => {
    const display = resolveCopyDisplay(presetTranslate, presetId, status?.presetInfo?.[presetId]);
    return runAction(
      () => callRemote(service, "copyPreset", presetId, newName, display),
      t("copySaved"),
      "matrix",
      applyStatus
    );
  };
  const deletePresetCall = (presetId) => runAction(
    () => callRemote(service, "deletePreset", presetId),
    t("presetDeleted"),
    "matrix",
    applyStatus
  );
  const agents = Array.isArray(status?.agents) ? status.agents : [];
  const hiddenSchemas = agents.reduce((total, agent) => total + (Number(agent?.hidden) || 0), 0);
  const warnings = Array.isArray(status?.warnings) ? status.warnings : [];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "atf-group", "aria-label": t("title"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-group-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "atf-group-title", children: t("title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-btns", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-btn atf-outline atf-sm", disabled: busy, onClick: () => {
          void refresh();
        }, children: t("refresh") }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, { flash, section: "header" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-row-text", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-row-label", children: t("enabled") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-row-desc", children: t("enabledDesc") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Switch,
          {
            checked: status?.enabled === true,
            onChange: setEnabled,
            label: t("enabled"),
            disabled: status === null || busy
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-row", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-row-text", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-row-label", children: status === null ? t("notLoaded") : t("statusLine", { agents: agents.length, hidden: hiddenSchemas }) }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-row-text", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-row-label", children: t("langLabel") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-row-desc", children: t("langDesc") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-btns", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          PillSelect,
          {
            value: langSetting,
            options: [
              { value: "auto", label: t("langAuto") },
              { value: "ru", label: t("langRu") },
              { value: "en", label: t("langEn") }
            ],
            onChange: changeLanguage,
            disabled: busy
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MatrixSection, { status, busy, t, onBind: bind, onUnbind: unbind, onCopyPreset: copyPresetCall, onDeletePreset: deletePresetCall }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, { flash, section: "matrix" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfilesSection, { status, busy, editing, t, onEdit: editProfile, onCopy: copyProfile, onCancel: () => setEditing(null), onSave: saveProfile, onDelete: deleteProfile }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, { flash, section: "profiles" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PacksSection, { packs: status?.packs ?? [], busy, t, onImport: importProfilePack }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, { flash, section: "packs" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanSection, { report: status?.report ?? null, t }),
    warnings.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "atf-group", "aria-label": t("warningsTitle"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-group-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "atf-group-title", children: t("warningsTitle") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "atf-counter", children: warnings.length })
      ] }),
      warnings.map((warning) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atf-alert", role: "alert", children: warning }, warning))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "atf-group", "aria-label": t("diagTitle"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-group-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "atf-group-title", children: t("diagTitle") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "atf-btn atf-outline atf-sm", onClick: () => setShowDiag((previous) => !previous), children: showDiag ? t("diagHide") : t("diagShow") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "atf-row-desc", children: t("diagDesc") }),
      showDiag && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "atf-report", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          t("diagRemote"),
          ": ",
          remoteMounted ? "mounted" : "not mounted"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          t("diagNamespace"),
          ": ",
          serviceRef ? "ok" : "missing"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          t("diagLocale"),
          ": ",
          presetTranslate ? "ok" : "missing"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          t("diagLang"),
          ": ",
          langSetting,
          " \u2192 ",
          resolveLang(langSetting, platformLang())
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          t("diagVersion"),
          ": ",
          status?.version ?? "\u2014"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          "presets: ",
          status?.presetIds?.length ?? 0,
          " \xB7 profiles: ",
          Object.keys(status?.profiles ?? {}).length,
          " \xB7 tools: ",
          status?.report?.names?.length ?? 0
        ] })
      ] })
    ] })
  ] });
}
function RowConfig({ view }) {
  const t = makeT(resolveLang(lastLanguage, platformLang()));
  if (view === "summary") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("summary") });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentToolFilterCard, { service: serviceRef });
}
function SafeRowConfig(props) {
  try {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RowConfig, { ...props });
  } catch (error) {
    console.error("dsh-agent-tool-filter: card render failed:", error);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { role: "alert", children: [
      "\u041E\u0448\u0438\u0431\u043A\u0430 \u0440\u0435\u043D\u0434\u0435\u0440\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438: ",
      messageOf(error)
    ] });
  }
}
var inject = ["remote", "slots"];
function apply(ctx) {
  ensureStyles();
  let disposeRemote;
  let cancelled = false;
  ctx.remote.$mount({
    package: PACKAGE_NAME,
    descriptors: clientDescriptors
  }).then((dispose) => {
    disposeRemote = dispose;
    remoteMounted = true;
    if (cancelled) return void dispose();
    try {
      ctx.inject(["remote.agentToolFilter"], (nsCtx) => {
        let ns;
        try {
          ns = nsCtx.remote?.agentToolFilter;
        } catch (error) {
          console.error("dsh-agent-tool-filter: nsCtx.remote read failed:", error);
        }
        if (!ns) {
          try {
            ns = nsCtx.get?.("remote.agentToolFilter");
          } catch (error) {
            console.error("dsh-agent-tool-filter: nsCtx.get read failed:", error);
          }
        }
        serviceRef = ns;
        console.info("dsh-agent-tool-filter: namespace captured:", ns ? "ok" : "missing");
        return () => {
          serviceRef = void 0;
        };
      });
    } catch (error) {
      console.error("dsh-agent-tool-filter: ctx.inject failed:", error);
    }
  }, (error) => {
    console.error("dsh-agent-tool-filter: Remote contribution failed:", error);
  });
  try {
    ctx.inject(["locale"], (localeCtx) => {
      let face;
      try {
        face = localeCtx.locale ?? (typeof localeCtx.get === "function" ? localeCtx.get("locale") : void 0);
      } catch (error) {
        console.error("dsh-agent-tool-filter: locale read failed:", error);
      }
      localeFaceRef = face;
      presetTranslate = typeof face?.bind === "function" ? face.bind("settings.agentPreset") : void 0;
      console.info("dsh-agent-tool-filter: locale captured:", face ? "ok" : "missing");
      return () => {
        localeFaceRef = void 0;
        presetTranslate = void 0;
      };
    });
  } catch (error) {
    console.error("dsh-agent-tool-filter: locale inject failed:", error);
  }
  ctx.effect(() => () => {
    cancelled = true;
    void disposeRemote?.();
  }, "dsh-agent-tool-filter: Remote contribution");
  ctx.slots.inject("plugins.row.config", () => {
    return ctx.slots.register({
      name: "plugins.row.config",
      key: SLOT_KEY
    }, ({ view }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SafeRowConfig, { view }));
  });
}
return module.exports; } });
