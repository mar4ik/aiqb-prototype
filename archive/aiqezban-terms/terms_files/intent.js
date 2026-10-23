(() => {
    if (window.intentOnce) {
        return
    }
    window.intentOnce = true
    window.intentParams = window.intentParams || {}

    const ADVERTISER_ID = '6ac48f3b3e211c2a5486450f'
    const INTENT_COOKIE_NAME = '_intentclid'
    const INTENT_STORAGE_PREFIX = '_intentEvt_'
    const REFERRER = document.referrer
    const MIN_SESSION_LENGTH = 1

    const Matcher = {
        isEqual: (a, b) => a === b,
        includes: (a, b) => a.includes(b),
        startsWith: (a, b) => a.startsWith(b),
    }

    const pathSlctrEvts = [
        
    ]

    function getSlctrEvtsForPath(pathname) {
        return pathSlctrEvts.reduce(
            (flat, currentValue) => {
                if (currentValue.patternFuncs.some(
                    (patternFunc) => patternFunc[1](pathname, decodeURIComponent(patternFunc[0]))
                )) {
                    currentValue.slctrEvts.forEach((slctrEvt) => flat.push(slctrEvt))
                }
                return flat
            }, []
        )
    }

    function processEvent(event, slctrEvts) {
        slctrEvts.filter(
            (slctrEvt) => (event.target.closest(slctrEvt[0]) != null)
        ).map(
            (slctrEvt) => {
                window.intentData.push([slctrEvt[1], slctrEvt[2] || {}])
            }
        )
    }

    function sessionsMonitor() {
        var startMillis = Date.now()
        var sessionCounter = 1

        return function () {
            if (document.visibilityState == "hidden" ) {
                const sessionLength = (Date.now() - startMillis) / 1000
                if (sessionLength >= MIN_SESSION_LENGTH) {
                    evt = ["session", {value: sessionLength}]
                    sendEvent(evt, '', sendBeacon)
                }
            } else {
                startMillis = Date.now()
                sessionCounter++
            }
        }
    }

    function clicksMonitor() {
        let lastPath = decodeURIComponent(location.pathname)
        let slctrEvts = getSlctrEvtsForPath(lastPath)

        return function (event) {
            const pathname = decodeURIComponent(location.pathname)
            if (lastPath !== pathname) {
                slctrEvts = getSlctrEvtsForPath(pathname)
                lastPath = pathname
            }
            if (slctrEvts.length > 0) {
                processEvent(event, slctrEvts)
            }
        }
    }

    async function attachMonitors() {
        document.addEventListener('click', clicksMonitor());
        document.addEventListener('visibilitychange', sessionsMonitor())
    }

    function getCookie(name) {
        const ca = document.cookie.split('; ')
        const match = ca.find(c => c.startsWith(name + '='))
        return match ? atob(decodeURIComponent(match.split('=')[1])) : '{}'
    }

    function isIntentClick(params) {
        const r = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}_[0-9]+_[0-9]+$/
        return params.click_id && r.test(params.click_id)
    }

    function getDomains() {
        let ret = []
        for (let parts = location.hostname.split('.'), i=parts.length-2; i>=0; i--)
            ret.push("." + parts.slice(i).join('.'))
        return ret
    }

    function setCookie(name, value, settings) {
        let settingsStr = ""
        for (let opt in settings) {
            if (opt !== "secure") {
                settingsStr += ";" + opt + "=" + settings[opt]
            } else if (settings[opt]) {
                settingsStr += ";secure"
            }
        }
        document.cookie = name + "=" + encodeURIComponent(btoa(value)) + settingsStr
        return getCookie(INTENT_COOKIE_NAME) === value
    }

    function setCookies(params) {
        let cookieJSON = {
            utm_source: params.utm_source && encodeURI(params.utm_source),
            utm_campaign: params.utm_campaign && encodeURI(params.utm_campaign),
            utm_platform: params.utm_platform && encodeURI(params.utm_platform),
            click_id: params.click_id,
            rg: params.rg,
        }
        let cookieSettings = {
            secure: false,
            "max-age": 365*24*3600,
            samesite: "Strict",
            path: "/"
        }
        for (let domains=getDomains(), i=0; i<domains.length; i++) {
            cookieSettings.domain = domains[i]
            if (setCookie(
                INTENT_COOKIE_NAME,
                JSON.stringify(cookieJSON, (k, v) => v !== null ? v : undefined),
                cookieSettings
            )) {
                break
            }
        }
    }

    async function init() {
        const paramstr = window.location.search || window.location.hash.substring(1)
        const params = new Proxy(new URLSearchParams(paramstr), {
            get: (searchParams, prop) => searchParams.get(prop),
        })

        if (isIntentClick(params)) {
            setCookies(params)
        }

        consumeIntentData()
    }

    function getEventObject(evt) {
        if (evt.length > 1 && evt[1].constructor === String) {
            return {
                // Old version
                advertiserId: evt[0] || ADVERTISER_ID,
                name: evt[1] || "page_view",
                userId: window.intentParams["userid"],
                value: evt[2] || 0.0,
            }
        }
        const params = evt[1] || {}
        return {
            advertiserId: params["advid"] || ADVERTISER_ID,
            name: evt[0] || "page_view",
            userId: params["userid"] || window.intentParams["userid"],
            value: params["value"] || 0.0,
        }
    }

    function sendBeacon(url, storageKey) {
        sessionStorage.removeItem(storageKey)
        navigator.sendBeacon(url)
    }

    function sendPxl(url, storageKey) {
        const pixel = document.createElement('img')
        pixel.src = url;
        (document.body || document.head).appendChild(pixel)
        pixel.onload = (_event) => {
            sessionStorage.removeItem(storageKey)
            pixel.remove()
        }
    }

    async function sendEvent(evt, storageKey='', transport=sendPxl) {
        let storageItem = {};
        if (!storageKey) {
            storageKey = INTENT_STORAGE_PREFIX + Math.floor(Math.random() * 1000).toString()
            const evtObj = getEventObject(evt)
            storageItem.advertiser_id = evtObj.advertiserId
            storageItem.name = evtObj.name
            storageItem.value = evtObj.value
            storageItem.userId = evtObj.userId
            storageItem.url = encodeURI(window.location.href)
            sessionStorage.setItem(storageKey, JSON.stringify(storageItem))
        } else {
            storageItem = JSON.parse(sessionStorage.getItem(storageKey))
        }
        const cookie = JSON.parse(getCookie(INTENT_COOKIE_NAME))

        const event = {
            url: storageItem.url,
            clid: cookie.click_id,
            e: storageItem.name,
            ev: storageItem.value,
            uc: cookie.utm_campaign,
            us: cookie.utm_source,
            up: cookie.utm_platform,
            rg: cookie.rg,
            pv: "0.0.17",
            uid: storageItem.userId,
            rf: REFERRER
        }
        if (storageItem.advertiser_id.length > 0) {
            event.advid = storageItem.advertiser_id
        }

        const p = encodeURIComponent(btoa(JSON.stringify(event)))
        const src = `https://events.intent.ai/analytics/pixel?p=${p}`;
        transport(src, storageKey)
    }

    async function consumeIntentData() {
        Object.keys(sessionStorage).forEach(function(key){
            if (key.startsWith(INTENT_STORAGE_PREFIX)) {
                sendEvent([], key)
            }
        })
        window.intentData.push = sendEvent

        while (window.intentData.length) {
            sendEvent(window.intentData.pop())
        }
    }

    window.intentData = window.intentData || []
    attachMonitors()
    init()
})();

// Backward compatibility
(() => {
    const ADVERTISER_ID = '6ac48f3b3e211c2a5486450f'

    window.intentData = window.intentData || []
    window.intentData.push([
        (typeof intent_event_name !== "undefined") ? intent_event_name : "page_view",
        {
            value: (typeof intent_event_value !== "undefined") ? intent_event_value : 0.0,
            advid: ADVERTISER_ID,
        }
    ])
    delete intent_event_name
    delete intent_event_value
})()
