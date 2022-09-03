// ==UserScript==
// @name            reRedirector & downloader
// @namespace       https://tribbe.de
// @version         1.4.0
// @description     Redirect streaming links directly to source
// @author          Tribbe (rePublic Studios)
// @license         MIT
//
// @include http://*/*
// @include https://*/*
//
// @require     https://raw.githubusercontent.com/tribbedev/userscripts/main/GM_config.js
//
// @grant   GM_getValue
// @grant   GM_setValue
// @grant   GM_deleteValue
// @grant   GM_listValues
// @grant   GM_addStyle
// ==/UserScript==

var devMode = true;

//reRedirector Session ID
