// ==UserScript==
// @name         reRedirector & downloader
// @namespace    https://tribbe.de
// @version      1.5.2
// @description  Redirect streaming links directly to source
// @author       Tribbe (rePublic Studios)
// @license      MIT
//
//
// @include http://*/*
// @include https://*/*
//
//
// @require      https://tribbe.dev/userscript/GM_config.js
// @downloadURL  https://raw.githubusercontent.com/tribbedev/userscripts/main/reRedirector%20%26%20downloader.js
//
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addStyle
// ==/UserScript==

var devMode = true;

//reRedirector Session ID
var rRId = null;
var rRId_Value = null;
var configInstanceId = null;

function GMConfig_data() {
  const id = configInstanceId ? configInstanceId : 0;
  const default_data = {
    id: "reRedirectorConfig" + id, // The id used for this instance of GM_config
    title: "reRedirector & downloader Settings",
    // Fields object
    fields: {
      downloadVideo: {
        label: "Download Videos",
        type: "checkbox",
        default: false,
      },
      disableNameing: {
        label: "Use timstamp instead of nameing pattern",
        type: "checkbox",
        default: false,
      },
    },
    css: `
      #GM_config {
        background-color: #0f1620;
    }

    label {
        color: #98a7c0;
    }

    .config_header {
        color: #98a7c0;
        margin-bottom: 20px!important;
    }

    #GM_config_resetLink {
        color: #98a7c0!important;
    }

    .saveclose_buttons{
        display: inline-block;
        padding: 0.3em 1em;
        text-decoration: none;
        color: #98a7c0;
        background-color: #0f1620;
        border: solid 2px #389fda;
        border-radius: 3px;
        transition: .4s;
        cursor: pointer;
    }

    .config_var{
        display: flex;
        align-items: center;
    }

    .config_var>input[type="text"]{
        display: inline-block;
        padding: 0.3em 1em;
        text-decoration: none;
        color: #98a7c0;
        background-color: #0f1620;
        border: solid 2px #389fda;
        border-radius: 3px;
    }

    .config_var>input[type="checkbox"]{
        height: 15px;
        width: 15px;
        appearance: none;
        border: 1px solid #34495E;
        border-radius: 4px;
        outline: none;
        background-color: #0f1620;
        cursor: pointer;
    }

    .config_var>input[type="checkbox"]:checked{
        border: 1px solid #41B883;
        background-color: #34495E;
    }
    `,
    events: {
      save: function () {
        GM_config.close();
      },
    },
  };
  switch (id) {
    case 1: //Anicloud / s.to
      return {
        ...default_data,
        fields: {
          ...default_data.fields,
          moviesNameing: {
            label: "Naming pattern of movies",
            type: "text",
            default: "@title [@language Edition]",
            title:
              "@title, @language @seriesTitle, @seasonNumber, @episodeNumber",
          },
          seriesNameing: {
            label: "Naming pattern of series",
            type: "text",
            default:
              "@seriesTitle S@seasonNumberE@episodeNumber [@language Edition]",
            title:
              "@title, @language @seriesTitle, @seasonNumber, @episodeNumber",
          },
          setEpisodeAsWatched: {
            label: "Automaticly mark Video as Watched (s.to/anicloud)",
            type: "checkbox",
            default: true,
          },
          autoRedirectNextPage: {
            label: "Automaticly redirect to next page (s.to/anicloud)",
            type: "checkbox",
            default: true,
          },
          autoRedirectNextSeason: {
            label: "Automaticly redirect to next season (s.to/anicloud)",
            type: "checkbox",
            default: true,
          },
          defaultLanguage: {
            lanel:
              "Select your favorite language for streams | order= selection -> ger -> ger sub -> eng",
            type: "select",
            options: ["German", "German Sub", "English"],
            default: "German",
          },
          defaultStreamingProvider: {
            lanel: "Select your favorite streaming provider",
            type: "select",
            options: ["VOE", "Streamtape", "Vidoza", "StreamZ"],
            default: "VOE",
          },
        },
      };
    case 2: //streamkiste
      return {
        ...default_data,
        fields: {
          ...default_data.fields,
          moviesNameing: {
            label: "Naming pattern of movies",
            type: "text",
            default: "@title (@year)",
            title: "@title, @year",
          },
        },
      };
  }
  return default_data;
}
GM_addStyle(`
    #GM_config {
        inset: 161px auto auto 198px!important;
        border: 3px solid #243743!important;
        height:40%!important;
        width: 30%!important;
        border-radius: 25px!important;
        margin-left: 20%!important;
        margin-right: 50%!important;
        max-height: 40%!important;
        max-width: 40%!important;
        opacity: 1!important;
        padding: 0px!important;
        position: fixed!important;
        z-index: 9999!important;
        display: block!important;
    }

    .configButton {
        position: fixed;
        right: 12px;
        bottom: 50px;
        height: 50px;
        width: 50px;
        cursor: pointer;
    }

    .skipVideoButton {
        color: #fff !important;
        padding: 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        float: right;
        background: #f94147;
        margin-top: -25px;
        margin-bottom: -7px;
        position: relative;
    }
  `);

//#region static data
var next_video_url, season_number, episode_number, episode_id, episode_name;
//#endregion

var loaded = false;
async function main() {
  configInstanceId = getConfigInstanceId();
  // check is working site or iframe
  if (!isIframe() && configInstanceId == -1) return;

  console.log("loaded: " + loaded);
  if (loaded) return;
  console.log(document.location.href);
  console.log("getRRId: " + (await getRRId(document.location.href)));
  if (!(await getRRId(document.location.href))) return;
  console.log("");
  console.log(
    "reRedirector Loaded (" +
      "rRId:" +
      rRId +
      " | configInstance:" +
      configInstanceId +
      ")"
  );
  console.log("host: " + document.location.hostname);
  var checkIsVideoNode = await waitForFound(
    "body>video[name='media']>source[type='video/mp4'][src]",
    5,
    500
  );
  GM_config.init(GMConfig_data());
  if (checkIsVideoNode != null && checkIsVideoNode.length == 1) {
    await videoHosterSource(checkIsVideoNode[0]);
  } else {
    selectFavoriteStream();
    await getEpisodeDetails();
    if (season_number) console.log("season_number: " + season_number);
    if (episode_number) console.log("episode_number: " + episode_number);
    if (episode_id) console.log("episode_id: " + episode_id);
    if (episode_name) console.log("episode_name: " + episode_name);
    next_video_url = await getNextVideoUrl();
    if (next_video_url) console.log("next_video_url: " + next_video_url);
    var video_src = await getVideoSrc();
    if (video_src) {
      console.log("video_src: " + video_src);
      window.location.href = video_src;
    } else if (!isIframe()) {
      //#region ConfigButton
      var gmConfigButton = document.createElement("img");
      gmConfigButton.src =
        "https://img.icons8.com/plasticine/452/apple-settings--v3.png";
      gmConfigButton.classList.add("configButton");
      gmConfigButton.addEventListener("click", function () {
        if (!GM_config.isOpen) GM_config.open();
        else GM_config.close();
      });
      document.body.appendChild(gmConfigButton);
      //#endregion
      await notVideoHoster(episode_name);
    }
  }
  //deleteOldGM();
  loaded = true;
}

//#region Methods
//#region webbased Methods
async function videoHosterSource(videoNode) {
  if (!String(videoNode.src).includes("do_not_delete")) {
    var autoplay =
      !GM_config.get("downloadVideo") &&
      isIframe() &&
      GM_config.get("autoRedirectNextPage");

    if (autoplay) {
      videoNode.parentNode.autoplay = "autoplay";
    } else videoNode.parentNode.autoplay = false;

    if (GM_config.get("downloadVideo")) {
      var episode_name = null;
      if (!GM_config.get("disableNameing"))
        episode_name = await getGM("episode_name");
      if (episode_name == null) episode_name = Date.now();
      //#region Download
      var link = document.createElement("a");
      link.download = episode_name + ".mp4";
      link.href = videoNode.src;
      link.click();
      await sleep(1000);
      //#endregion
    }

    await deleteAllGM(true);

    if (
      (GM_config.get("autoRedirectNextPage") ||
        GM_config.get("setEpisodeAsWatched")) &&
      isIframe()
    ) {
      if (GM_config.get("downloadVideo"))
        window.top.postMessage("finishedVideo", "*");
      else {
        videoNode.parentNode.addEventListener("ended", async function () {
          window.top.postMessage("finishedVideo", "*");
        });
      }
    }
  } else {
    // streamtape bypass
    console.log("Streamtape adurl found.... retry");
    window.top.postMessage("reload", "*");
  }
}

async function notVideoHoster() {
  //#region SkipButton
  var changeLanguageNode = await waitForFound(
    "div[class='hosterSiteVideo']>div[class='changeLanguage']",
    5,
    500
  );
  if (changeLanguageNode && changeLanguageNode.length == 1) {
    var gmSkipButton = document.createElement("div");
    gmSkipButton.classList.add("skipVideoButton");
    gmSkipButton.addEventListener("click", async function () {
      finishedVideo(true);
    });
    gmSkipButton.innerText = "Skip Video";
    changeLanguageNode[0].appendChild(gmSkipButton);
  }
  //#endregion

  if (
    GM_config.get("downloadVideo") &&
    !GM_config.get("disableNameing") &&
    episode_name
  ) {
    await setGM("episode_name", episode_name);
  }

  if (next_video_url) {
    if (
      !GM_config.get("autoRedirectNextPage") &&
      GM_config.get("downloadVideo")
    ) {
      var count = 0;
      while (count <= 60) {
        await sleep(1000);
        count++;
      }
      finishedVideo(true);
    }
  }
}
//#endregion

//#region get Methods
async function getEpisodeDetails() {
  if (!GM_config.get("disableNameing")) {
    //s.to // aniworld
    if (isSTO() || isAnicloud()) {
      var seriesTitleNode = document.querySelectorAll(
        "div[class*='series-title']>h1>span"
      ); // seriesTitle
      var episodeGermanTitleNode = document.querySelectorAll(
        "div[class*='hosterSiteTitle']>h2>span[class*='episodeGermanTitle']"
      ); // episodeGermanTitle
      var episodeEnglishTitleNode = document.querySelectorAll(
        "div[class*='hosterSiteTitle']>h2>small[class*='episodeEnglishTitle']"
      ); // episodeEnglishTitle
      var languageNode = document.querySelectorAll(
        "div[class*='changeLanguage']>div[class*='changeLanguageBox']>img[class*='selectedLanguage']"
      );
      var languageNr =
        languageNode.length > 0
          ? parseInt(languageNode[0].getAttribute("data-lang-key"))
          : 0; // 3 = Japanese, 2 = English, 1 = Deutsch
      var episodeTitleNode =
        languageNr == 1 && episodeGermanTitleNode.length > 0
          ? episodeGermanTitleNode
          : episodeEnglishTitleNode;
      var episodeNode = document.querySelectorAll(
        "div[class*='hosterSiteDirectNav']>ul>li>a[class*='active'][data-season-id]"
      );
      if (
        seriesTitleNode.length > 0 &&
        episodeTitleNode.length > 0 &&
        episodeNode.length > 0
      ) {
        var seriesTitle = seriesTitleNode[0].textContent.replaceAll(":", " -");
        var episodeTitle = episodeTitleNode[0].textContent
          .replaceAll(":", " -")
          .replace(/^\s+/, "")
          .replace("[", "(")
          .replace("]", ")");
        season_number = parseInt(episodeNode[0].getAttribute("data-season-id"));
        var language =
          languageNr == 1
            ? "German"
            : languageNr == 2
            ? "English"
            : languageNr == 3
            ? "Japanese"
            : "";

        episode_number = parseInt(episodeNode[0].textContent);

        if (season_number == 0)
          episode_name = GM_config.get("moviesNameing")
            .replaceAll("@title", episodeTitle)
            .replaceAll("@language", language)
            .replaceAll("@seriesTitle", seriesTitle)
            .replaceAll(
              "@seasonNumber",
              (season_number <= 9 ? "0" : "") + season_number
            )
            .replaceAll(
              "@episodeNumber",
              (episode_number <= 9 ? "0" : "") + episode_number
            );
        else
          episode_name = GM_config.get("seriesNameing")
            .replaceAll("@title", episodeTitle)
            .replaceAll("@language", language)
            .replaceAll("@seriesTitle", seriesTitle)
            .replaceAll(
              "@seasonNumber",
              (season_number <= 9 ? "0" : "") + season_number
            )
            .replaceAll(
              "@episodeNumber",
              (episode_number <= 9 ? "0" : "") + episode_number
            );

        episode_id = parseInt(episodeNode[0].getAttribute("data-episode-id"));
      }
    }

    //streamkiste
    if (isStreamkiste()) {
      var movieTitleNode = document.querySelectorAll(
        "div[class='info-right']>div[class='title']>h1"
      );
      var movieYearNode = document.querySelectorAll(
        "div[class='info-right']>div[class='title']>div[class='release']"
      );
      // #region language
      // var languageNode = document.querySelectorAll(
      //   "div[class='stream-out']>div[class='stream-bg']>label>select[id='lang']"
      // );
      // if (languageNode.length == 1) {
      //   languageSelection = languageNode[0];
      //   for (var i = 0; i < languageSelection.options.length; i++) {
      //     if (languageSelection.options[i].text.includes("Deutsch")) {
      //       languageSelection.selectedIndex = i;
      //       languageSelection.dispatchEvent(new Event("change"));
      //       break;
      //     }
      //   }
      // }
      // #endregion
      // #region movieQuality
      var movieQualityNode = document.querySelectorAll(
        "div[class='stream-out']>div[class='stream-bg']>label>select[id='rel']"
      );
      if (movieQualityNode.length > 0) {
        const movieQualitySelection = movieQualityNode[0];
        movieQualitySelection.selectedIndex = 0;
        movieQualitySelection.dispatchEvent(new Event("change"));
      }
      // #endregion
      // #region movieStream
      var movieStreamsNode = document.querySelectorAll(
        "div[id='stream-container'][class='serien']>div[id='single-stream']>div[id='stream']>li[class='stream']>div[id='stream-links']>a"
      );
      if (movieStreamsNode.length > 0) {
        for (var i = 0; i < movieStreamsNode.length; i++) {
          const movieStream = movieStreamsNode[i];
          if (
            movieStream.innerText.includes("VOE") ||
            movieStream.innerText.includes("Streamtape")
          ) {
            movieStream.click();
            break;
          }
        }
      }
      // #endregion

      if (movieTitleNode.length > 0 && movieYearNode.length > 0) {
        episode_name = GM_config.get("moviesNameing")
          .replaceAll("@title", movieTitleNode[0].textContent)
          .replaceAll(
            "@year",
            movieYearNode[0].textContent.replace("(", "").replace(")", "")
          );
      }
    }
  }

  return;
}

async function selectFavoriteStream() {
  var baseStreamingNode = document.querySelectorAll(
    "ul[class='row']>li[data-lang-key]"
  );
  if (baseStreamingNode.length == 0) return;

  var favLangNr = GM_config.get("defaultLanguage");
  favLangNr =
    favLangNr == "German"
      ? 1
      : favLangNr == "English"
      ? 2
      : favLangNr == "German Sub"
      ? 3
      : 0;
  var favStreamingProvider = GM_config.get("defaultStreamingProvider");

  var streamingUrlNode = null;
  var count = 0;
  while (streamingUrlNode == null || count >= 13) {
    count++;
    var _streamingUrlNode = Array.from(
      document.querySelectorAll(
        "ul[class='row']>li[data-lang-key='" + favLangNr + "']"
      )
    );
    if (_streamingUrlNode.length > 0) {
      _streamingUrlNode = _streamingUrlNode.find((el) =>
        el.textContent.includes(favStreamingProvider)
      );
      if (_streamingUrlNode) {
        streamingUrlNode = _streamingUrlNode;
      } else {
        favStreamingProvider =
          favStreamingProvider == "VOE"
            ? "Streamtape"
            : favStreamingProvider == "Streamtape"
            ? "Vidoza"
            : favStreamingProvider == "Vidoza"
            ? "StreamZ"
            : "VOE";
      }
    } else {
      favLangNr = favLangNr == 1 ? 3 : favLangNr == 3 ? 2 : 1;
    }
  }
  debug(streamingUrlNode);
  if (streamingUrlNode) {
    streamingUrlNode = streamingUrlNode.querySelector(
      "div>a[class='watchEpisode']"
    );
    if (streamingUrlNode) {
      if (
        document.querySelectorAll(
          "iframe[src='" + streamingUrlNode.getAttribute("href") + "']"
        ).length == 0
      ) {
        debug("Fav stream found...");
        streamingUrlNode.click();
      }
    }
  }
}

async function getNextVideoUrl() {
  var next_video_url = null;
  //s.to // anicloud
  if (
    GM_config.get("autoRedirectNextPage") &&
    season_number &&
    episode_number &&
    (isSTO() || isAnicloud())
  ) {
    var newEpisodeUrlNode = Array.from(
      document.querySelectorAll(
        "div[class*='hosterSiteDirectNav']>ul>li>a[data-season-id]"
      )
    ).find((el) => el.textContent == episode_number + 1);
    if (newEpisodeUrlNode) {
      next_video_url = newEpisodeUrlNode.getAttribute("href");
    } else if (GM_config.get("autoRedirectNextSeason")) {
      var newSeasonUrlNode = Array.from(
        document.querySelectorAll(
          "div[class*='hosterSiteDirectNav']>ul>li>a[title^='Staffel']"
        )
      ).find((el) => el.textContent == season_number + 1);
      if (newSeasonUrlNode) {
        next_video_url = newSeasonUrlNode.getAttribute("href") + "/episode-1";
      }
    }
  }
  return next_video_url;
}

async function getVideoSrc() {
  var content = document.body.textContent;
  var video = null;
  var videoNode = null;

  var retry = false;
  //VOE
  if (
    document.querySelectorAll(
      "div[class='plyr__video-wrapper']>video[id='voe-player']"
    ).length > 0
  ) {
    retry = true;

    var mp4finder = null;
    mp4finder = content.match(/('https?.*?\.mp4.*?')/g);
    if (mp4finder != null) video = mp4finder[0].replaceAll("'", "");

    if (video == null) {
      mp4finder = content.match(/sources\[\"mp4\"\] = .*?\(\[(.*?)]\);/);
      if (mp4finder != null && mp4finder.length == 2) {
        var mp4array = mp4finder[1].replaceAll("'", "").split(",");
        var p01 = mp4array.join("").split("").reverse().join("");
        video = atob(p01);
      }
    }
  }

  //Streamtape
  if (
    document.location.hostname.includes("streamtape.") ||
    document.location.hostname.includes("str.") ||
    document.location.hostname.includes("tapecontent.") ||
    document.location.hostname.includes("stape.") ||
    document.location.hostname.includes("adblockstrtech.")
  ) {
    retry = true;

    videoNode = document.querySelectorAll("div[id*='link']");
    var bFound = false;
    for (const link of Object.values(videoNode)) {
      var url = "https:" + link.textContent;
      if (
        !bFound &&
        url.includes(document.location.hostname + "/get_video?id=")
      ) {
        bFound = true;
        video = url;
      }
    }
  }

  //Vidoza
  if (document.location.hostname.includes("vidoza.net")) {
    retry = true;

    videoNode = document.querySelectorAll(
      "video[id*='player_html5_api'][class*='vjs-tech']>source[type*='video/mp4'][src]"
    );
    if (videoNode.length > 0) {
      video = videoNode[0].getAttribute("src");
    }
  }

  //StreamZ
  if (
    document.location.hostname.includes("streamz.ws") ||
    document.location.hostname.includes("streamzz.to")
  ) {
    retry = true;

    videoNode = document.querySelectorAll("video[id*='video_1_html5_api']");
    if (videoNode.length > 0) {
      video = videoNode[0].getAttribute("src");
    }
  }

  //Evoload
  if (document.location.hostname.includes("evoload.")) {
    retry = true;

    videoNode = document.querySelectorAll("video[id*='EvoVid_html5_api']");
    if (videoNode.length > 0) {
      video = videoNode[0].getAttribute("src");
    }
  }
  if (video == null && retry) {
    await sleep(500);
    return await getVideoSrc();
  }

  return video;
}

async function finishedVideo(forceRedirect = false) {
  if (GM_config.get("setEpisodeAsWatched") && episode_id) {
    setEpisodeAsWatched();
  }

  if (
    next_video_url &&
    (forceRedirect || GM_config.get("autoRedirectNextPage"))
  )
    window.location.href = next_video_url;
}

function setEpisodeAsWatched() {
  var http = new XMLHttpRequest();
  http.open("POST", "/ajax/lastseen", true);
  http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  http.send("episode=" + episode_id);
}
//#endregion

//#region is Methods
function isSTO() {
  return (
    document.location.hostname.includes("serien.") ||
    document.location.hostname.includes("s.") ||
    document.location.hostname.includes("serienstream.") ||
    document.location.hostname.includes("190.115.18.20")
  );
}

function isAnicloud() {
  return (
    document.location.hostname.includes("anicloud.") ||
    document.location.hostname.includes("aniworld.")
  );
}

function isStreamkiste() {
  return document.location.hostname.includes("streamkiste.");
}

function getConfigInstanceId() {
  if (configInstanceId) return configInstanceId;
  if (isSTO() || isAnicloud()) return 1;
  if (isStreamkiste()) return 2;
  return -1;
}
//#endregion

//#region get-/set-GM
async function getGM(
  variable_name,
  timeout = 1000,
  timout_counter = 10,
  delete_if_found = true
) {
  var return_value = null;
  var counter = 0;
  while (return_value == null && counter < timout_counter) {
    return_value = await GM_getValue("republic_" + rRId + "_" + variable_name);
    await sleep(timeout);
    counter++;
  }
  if (return_value != null && delete_if_found) deleteGM(variable_name);

  debug("getGM: republic_" + rRId + "_" + variable_name + ": " + return_value);
  return return_value;
}

async function setGM(variable_name, value) {
  debug("setGM: republic_" + rRId + "_" + variable_name + ": " + value);
  await GM_setValue("republic_" + rRId + "_" + variable_name, value);
}

async function deleteGM(variable_name) {
  debug("deleteGM: republic_" + rRId + "_" + variable_name);
  await GM_deleteValue("republic_" + rRId + "_" + variable_name);
}

async function deleteAllGM(session = false, _rRId = null) {
  _rRId = _rRId == null ? rRId : _rRId;
  let gmRPKeys = await GM_listValues();
  for (let key of gmRPKeys) {
    if (
      key.includes("republic_") &&
      (session == false || key.includes(_rRId))
    ) {
      debug("deleteAllGM: " + key);
      await GM_deleteValue(key);
    }
  }
}

async function checkrRId(_rRId) {
  if (_rRId) {
    if (Date.now() - _rRId >= 3600000 || rRId == "null") {
      debug("delete rRId: " + _rRId);
      await deleteAllGM(true, _rRId);
      sessionStorage.removeItem("republic_sess");
      rRId = null;
    }
  }
}
//#endregion

//#region general Methods
async function getRRId(_url) {
  if (rRId == null) {
    if (!isIframe()) {
      //check sessionstorage
      rRId = sessionStorage.getItem("republic_sess");
      checkrRId(rRId);
      //check GM
      let gmRPKeys = await GM_listValues();
      for (let key of gmRPKeys) {
        if (key.includes("republic_") && key.includes("_sess")) {
          var _id = Number(key.split("_")[1]);
          checkrRId(_id);
          if (rRId == null || _id == rRId) {
            var value = GM_getValue(key);
            if (isString(value) && value.includes(_url)) {
              rRId = _id;
              rRId_Value = value;
            }
          }
        }
      }
      if (rRId == null || rRId == "null") {
        rRId = Date.now();
        rRId_Value = _url;

        await setGM("sess", rRId_Value);
        sessionStorage.setItem("republic_sess", rRId);
      }
      debug("debug: " + typeof rRId);
    } else {
      var count = 0;
      while (count < 4) {
        if (rRId != null) break;
        await sleep(1000);
        count++;
      }
    }
  }
  rRId = rRId != null ? rRId : getRRId(_url);
  return rRId;
}

async function sleep(timeout) {
  await new Promise((r) => setTimeout(r, timeout));
}

async function waitForFound(selector, count, timeout, currentcount = 0) {
  var targetNode = document.querySelectorAll(selector);
  if (targetNode.length > 0) return targetNode;
  if (currentcount < count) {
    await sleep(timeout);
    return waitForFound(selector, count, timeout, currentcount + 1);
  } else {
    return null;
  }
}

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]";
}

function isIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}
function debug(log) {
  if (devMode) {
    console.log(log);
  }
}
//#endregion
//#endregion

function postMessageRecieve(evt) {
  var header,
    data = null,
    other = null;
  const dataArray = evt.data.split("|");
  if (dataArray.length >= 2) {
    header = dataArray[0];
    data = dataArray[1];
    other = dataArray[2];
  } else header = evt.data;

  switch (header) {
    case "rRId":
      if (data == null && rRId)
        evt.source.postMessage(
          "rRId|" + rRId + (configInstanceId ? "|" + configInstanceId : ""),
          evt.origin
        );
      else if (data != null) {
        data = parseInt(data);
        if (rRId == null || data != rRId) rRId = data;
        if (other != null) configInstanceId = parseInt(other);
      }
      break;
    case "finishedVideo":
      finishedVideo();
      break;
    case "reload":
      location.reload();
      break;
  }
}

if (window["postMessage"])
  if (window.addEventListener)
    window.addEventListener("message", postMessageRecieve, false);
  else window.attachEvent("onmessage", postMessageRecieve);

if (isIframe() && window["postMessage"] && rRId == null)
  window.top.postMessage("rRId", "*");

main();
