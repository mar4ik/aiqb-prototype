/* ============================================================
   survey.js — «AI-ն ինչի՞դ ա պետք» (survey.html, at /survey)

   The needs survey, survey version 2026-11-24. One question a screen, the branching from the survey document
   (Հ1–Հ12, Ա1–Ա3), then a rule-based recommendation (no AI model: the matching table below decides) and the
   optional questions after it (Կ1–Կ3, the fit feedback).

   01 · Config        where answers go (SURVEY_ENDPOINT), versions
   02 · Content       the questions and the task → recommendation table
   03 · Flow          which screens a respondent sees, in which order
   04 · Screens       drawing one question, its rules (limits, exclusive answers, validation)
   05 · Result        choosing and writing the recommendation
   06 · After         the optional questions, the record, sending
   07 · Start         session storage, history (the phone's back button), first screen
   ============================================================ */
(() => {
  'use strict';

  /* ---------- 01 · Config ---------- */
  // Where answers go: the Vercel function api/survey.js, which writes them to Google Sheets (lib/survey-sheets.mjs).
  // Kept apart as the survey document asks: the anonymous answers when the result opens, the questions after it, and
  // the contact details with their consents only if the person asks for a copy (Կ3). '' keeps everything in the browser.
  // The local preview (npm run serve) has no functions: the posts there fail quietly, and only Կ3 says so.
  const SURVEY_ENDPOINT = '/api/survey';
  const SURVEY_VERSION = '2026-11-24';
  const RULES_VERSION = 'r1';
  const STORE_KEY = 'aiqb-survey';

  const root = document.getElementById('survey');
  if (!root) return;
  const screens = {
    intro: root.querySelector('[data-screen="intro"]'),
    question: root.querySelector('[data-screen="question"]'),
    result: root.querySelector('[data-screen="result"]'),
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const has = (list, v) => Array.isArray(list) && list.includes(v);
  const filled = (s) => typeof s === 'string' && s.trim() !== '';
  // «Key words| rest»: the words before | are set SemiBold, so a long list can be scanned
  const labelHtml = (label) => { const [k, rest] = label.split('|'); return rest === undefined ? esc(k) : `<b>${esc(k)}</b>${esc(rest)}`; };
  const plain = (label) => label.replace('|', '');

  /* ---------- 02 · Content ---------- */
  // The tasks of Հ2 (T01–T12; the codes are never shown). Each carries its first recommendation from the matching
  // table: the outcome, one tool, three steps, a ready prompt ([…] are the blanks, shown in Orange), what to check,
  // how to measure, the skill to learn; which bottlenecks (Հ7) and goals (Հ4) it answers, and which income obstacles
  // (Ա3) it helps with. `auto`: a candidate for automation once its connections are checked.
  const TASKS = {
    T01: {
      label: 'Նամակներ, հաղորդագրություններ| կամ այլ տեքստեր գրել', short: 'Նամակներ և տեքստեր գրել',
      headline: 'Գրեք նամակներն ավելի արագ',
      problem: 'Նամակներ, հաղորդագրություններ կամ այլ տեքստեր գրելը ձեզնից շատ ժամանակ կամ ջանք է պահանջում։',
      action: 'Ձեր նշած փաստերից AI օգնականը պատրաստում է նամակի սևագիր, իսկ դուք ստուգում եք փաստերն ու ոճը։',
      tool: 'Gemini',
      steps: ['Ընտրեք մեկ նամակ, որը հաճախ եք գրում։', 'Գրեք դրա հիմնական փաստերը և խնդրեք պատրաստել սևագիր։', 'Ստուգեք փաստերը, անուններն ու ոճը և ուղարկեք ինքներդ։'],
      prompt: 'Գրի՛ր կարճ և քաղաքավարի նամակ հայերենով։\nՈւմ է ուղղված՝ [լրացրեք]\nՆպատակը՝ [լրացրեք]\nՓաստերը՝ [լրացրեք]\nՕգտագործի՛ր միայն տրված փաստերը։ Եթե ինչ-որ բան պակասում է, նշի՛ր՝ ինչը պետք է ճշտել։',
      check: 'Անունները, թվերը, ամսաթվերը և խոստումները։',
      measure: 'Մեկ նամակի վրա ծախսվող ամբողջ ժամանակը՝ ստուգումով հանդերձ։',
      skill: 'Հստակ առաջադրանք տալ, համատեքստ և օրինակ ավելացնել, արդյունքը խմբագրել։',
      idea: 'Մեկ հաճախակի նամակից ձևանմուշ պատրաստել և ամեն անգամ լրացնել միայն փոփոխվող մասերը։',
      solves: ['start', 'phrase', 'skill'], goals: ['free', 'more', 'quality', 'tired'], income: ['time'],
    },
    T02: {
      label: 'Տեղեկություն փնտրել|, համեմատել կամ երկար նյութեր հասկանալ', short: 'Տեղեկություն փնտրել և հասկանալ',
      headline: 'Հասկացեք երկար նյութերն ավելի արագ',
      problem: 'Տեղեկություն փնտրելը, համեմատելը կամ երկար նյութեր հասկանալը ձեզնից շատ ժամանակ է խլում։',
      action: 'Ձեր տված փաստաթղթերից ստանում եք ամփոփում և պատասխաններ՝ աղբյուրի հղումներով։',
      tool: 'Gemini Notebook (NotebookLM)',
      steps: ['Վերցրեք մեկ նյութ, որը պետք է հասկանալ։', 'Ավելացրեք այն Gemini Notebook-ում և խնդրեք 5 կարևոր միտք՝ հղումներով։', 'Թարմ արտաքին փաստերը ստուգեք սկզբնաղբյուրներում։'],
      prompt: 'Օգտագործի՛ր միայն ավելացված նյութը։\nԱռանձնացրու՛ 5 կարևոր միտք և յուրաքանչյուրի համար նշի՛ր նյութի համապատասխան հատվածը։\nԻնձ համար կարևոր է՝ [լրացրեք]\nԵթե նյութում պատասխան չկա, բացահայտ գրի՛ր դա։',
      check: 'Աղբյուրի հղումները և թարմ փաստերը՝ սկզբնաղբյուրում։',
      measure: 'Մեկ նյութը հասկանալու և ամփոփելու ամբողջ ժամանակը։',
      skill: 'Աղբյուրների հետ աշխատել, հարցեր ձևակերպել, փաստերը ստուգել։',
      idea: 'Երկար նյութից ստանալ 5 կարևոր միտք՝ աղբյուրի հղումներով։',
      solves: ['info', 'start', 'check'], goals: ['free', 'more', 'quality', 'learn'], income: ['skill'],
    },
    T03: {
      label: 'Նոր բան սովորել| կամ ուրիշներին բացատրել', short: 'Սովորել կամ բացատրել',
      headline: 'Սովորեք և բացատրեք ավելի հեշտ',
      problem: 'Նոր բան սովորելը կամ ուրիշներին բացատրելը ձեզնից շատ ժամանակ կամ ջանք է պահանջում։',
      action: 'Տրված նյութից ստանում եք լսարանի մակարդակին համապատասխան բացատրություն և վարժություններ, ուսուցչի դեպքում՝ դասի պլանի սևագիր։',
      tool: 'Gemini կամ Gemini Notebook',
      steps: ['Ընտրեք մեկ թեմա և դրա թույլատրելի նյութը։', 'Խնդրեք բացատրություն ձեր լսարանի մակարդակով և 5 ստուգիչ հարց։', 'Ստուգեք պատասխաններն ու բարդությունը։'],
      prompt: 'Օգտագործի՛ր միայն ստորև տրված նյութը։\nԲացատրի՛ր այն [մակարդակը կամ դասարանը] համար պարզ բառերով։\nՀետո պատրաստի՛ր 5 ստուգիչ հարց՝ պատասխաններով և կարճ բացատրությամբ։\nԵթե նյութը բավարար չէ, բացահայտ գրի՛ր դա։\nՆյութը՝ [լրացրեք]',
      check: 'Պատասխանների ճշտությունը և համապատասխանությունը ձեր նպատակին։',
      measure: 'Մեկ թեմայի կամ դասի պատրաստման ամբողջ ժամանակը և ուղղումների քանակը։',
      skill: 'Նյութը լսարանին հարմարեցնել, աղբյուրներն ու պատասխանները ստուգել։',
      idea: 'Մեկ թեմայից ստանալ պարզ բացատրություն և 5 ստուգիչ հարց։',
      solves: ['start', 'info', 'skill', 'phrase'], goals: ['learn', 'quality', 'free', 'more'], income: ['skill'],
    },
    T04: {
      label: 'Թարգմանել| կամ աշխատել օտար լեզվով', short: 'Թարգմանել կամ աշխատել օտար լեզվով',
      headline: 'Աշխատեք օտար լեզվով ավելի վստահ',
      problem: 'Թարգմանելը կամ օտար լեզվով աշխատելը ձեզնից շատ ժամանակ կամ ջանք է պահանջում։',
      action: 'Ստանում եք թարգմանության կամ պատասխան նամակի սևագիր՝ պահպանված անուններով ու թվերով։',
      tool: 'AI օգնական (օրինակ՝ Gemini)՝ հայերենի որակը նախապես փորձարկելով',
      steps: ['Ընտրեք մեկ կարճ, ոչ գաղտնի տեքստ։', 'Խնդրեք թարգմանության կամ պատասխանի սևագիր՝ պահելով անուններն ու թվերը։', 'Համեմատեք բնօրինակի հետ և ճշտեք տերմինները։'],
      prompt: 'Թարգմանի՛ր ստորև տեքստը [լեզուն] լեզվով։\nՊահպանի՛ր անունները, թվերը և ամսաթվերը անփոփոխ։\nՈճը՝ [պաշտոնական կամ սովորական]\nԱնհասկանալի տերմինները նշի՛ր առանձին ցանկով։\nՏեքստը՝ [լրացրեք]',
      check: 'Անունները, թվերը, տերմինները և իմաստը՝ բնօրինակի համեմատ։',
      measure: 'Մեկ տեքստի ամբողջ ժամանակը և ուղղումների քանակը։',
      skill: 'Տերմինների ցանկ կազմել, ոճը հստակեցնել, համեմատելով ստուգել։',
      idea: 'Կարճ տեքստի թարգմանության սևագիր՝ անփոփոխ անուններով ու թվերով։',
      solves: ['phrase', 'skill', 'check', 'start'], goals: ['free', 'quality', 'more'], income: ['skill'],
    },
    T05: {
      label: 'Աղյուսակներ, թվեր| կամ հաշվետվություններ մշակել', short: 'Աղյուսակներ և թվեր մշակել',
      headline: 'Մշակեք թվերը քիչ սխալներով',
      problem: 'Աղյուսակներ, թվեր կամ հաշվետվություններ մշակելը ձեզնից շատ ժամանակ կամ ջանք է պահանջում։',
      action: 'Ստանում եք աղյուսակի կառուցվածք և բանաձևի նախագիծ, որը ստուգում եք հայտնի արդյունքով փոքր օրինակի վրա։ Թվային արդյունքը հաշվում է աղյուսակը, ոչ թե AI-ը։',
      tool: 'AI օգնական և ձեր աղյուսակը (Excel կամ Google Sheets)',
      steps: ['Վերցրեք փոքր օրինակ, որի ճիշտ արդյունքը գիտեք։', 'Խնդրեք AI օգնականին առաջարկել աղյուսակի կառուցվածքը և բանաձևը։', 'Ստուգեք բանաձևը հայտնի արդյունքով, հետո միայն կիրառեք ամբողջ աղյուսակին։'],
      prompt: 'Ունեմ աղյուսակ հետևյալ սյունակներով՝ [լրացրեք]\nՊետք է հաշվել՝ [լրացրեք]\nԱռաջարկի՛ր Excel կամ Google Sheets բանաձև և բացատրի՛ր այն քայլ առ քայլ։\nՄի՛ հորինիր թվեր․ հաշվարկը կանի աղյուսակը։',
      check: 'Բանաձևի արդյունքը՝ հայտնի պատասխան ունեցող փոքր օրինակի վրա։',
      measure: 'Մեկ հաշվետվության ամբողջ ժամանակը և սխալների քանակը։',
      skill: 'Տվյալները մաքրել, բանաձևերը ստուգել։',
      idea: 'Աղյուսակի բանաձևի նախագիծ, որը ստուգվում է հայտնի արդյունքով։',
      note: 'Եթե սովորական բանաձևը բավարար է, AI պարտադիր չէ։',
      solves: ['repeat', 'check', 'skill', 'start'], goals: ['free', 'quality', 'more'], income: ['time'],
    },
    T06: {
      label: 'Հրապարակումներ, նկարներ|, տեսանյութեր կամ ներկայացումներ պատրաստել', short: 'Հրապարակումներ և ներկայացումներ պատրաստել',
      headline: 'Պատրաստեք հրապարակումներն ավելի արագ',
      problem: 'Հրապարակումներ, նկարներ, տեսանյութեր կամ ներկայացումներ պատրաստելը ձեզնից շատ ժամանակ կամ ջանք է պահանջում։',
      action: 'Ստուգված բովանդակությունից ստանում եք հրապարակման կառուցվածք կամ սահիկների առաջին տարբերակ։ Տեսանյութի դեպքում նախ՝ սցենար և կադրերի պլան։',
      tool: 'Gamma՝ սահիկների համար, Canva՝ ձևավորման համար',
      steps: ['Նախ գրեք կամ ստուգեք բովանդակությունը։', 'Ստացեք սահիկների կամ հրապարակման առաջին տարբերակը։', 'Ստուգեք հայերեն տեքստը, տառատեսակներն ու արտահանված ֆայլը։'],
      prompt: 'Պատրաստի՛ր [հրապարակման կամ ներկայացման] կառուցվածքը ստորև տեքստից։\nԼսարանը՝ [լրացրեք]\nՆպատակը՝ [լրացրեք]\nՕգտագործի՛ր միայն տրված տեքստը և մի՛ ավելացրու փաստեր։\nՏեքստը՝ [լրացրեք]',
      check: 'Հայերեն տեքստը, տառատեսակները, փաստերը և արտահանված ֆայլը։',
      measure: 'Մեկ հրապարակման կամ ներկայացման ամբողջ ժամանակը։',
      skill: 'Նպատակ և լսարան որոշել, կառուցվածք տալ, հայերեն տեքստը վերջնական ստուգել։',
      idea: 'Պատրաստի տեքստից ստանալ սահիկների կամ հրապարակման առաջին տարբերակը։',
      note: 'Canva-ի Magic Design-ը հայերեն հրահանգները կարող է լիարժեք չաջակցել․ հայերեն տեքստը ստուգեք առանձին։',
      solves: ['start', 'phrase', 'skill'], goals: ['free', 'more', 'quality', 'income'], income: ['offer', 'clients'],
    },
    T07: {
      label: 'Հաճախորդների հարցերին| պատասխանել կամ պատվերներ մշակել', short: 'Հաճախորդների հարցերին պատասխանել',
      headline: 'Պատասխանեք հաճախորդներին ավելի քիչ ջանքով',
      problem: 'Հաճախորդների կրկնվող հարցերին պատասխանելը կամ պատվերներ մշակելը ձեզնից շատ ժամանակ է խլում։',
      action: 'Հաճախակի հարցերի հաստատված պատասխաններից AI-ը պատրաստում է սևագիր, իսկ դուք ստուգում և ուղարկում եք։',
      tool: 'AI օգնական',
      steps: ['Կազմեք 10 հաճախակի հարցի ցանկ և դրանց ճիշտ պատասխանները։', 'Դրանց հիման վրա AI օգնականից խնդրեք կարճ պատասխանների սևագրեր։', 'Ստուգեք գինը, ժամկետն ու պայմանները և ուղարկեք ինքներդ։'],
      prompt: 'Ստորև իմ ծառայության մասին հաստատված տեղեկություններն են և հաճախորդի հարցը։\nԳրի՛ր կարճ, բնական հայերեն պատասխան՝ մինչև 60 բառ։\nՕգտագործի՛ր միայն տրված փաստերը։ Եթե տեղեկությունը չի բավականացնում, նշի՛ր՝ ինչն է պետք ճշտել։ Գներ կամ պայմաններ մի՛ հորինիր։\nՏեղեկություններ՝ [լրացրեք]\nՀարց՝ [լրացրեք՝ առանց անձնական տվյալների]',
      check: 'Գները, ժամկետները և պայմանները։',
      measure: 'Երեք իրական հարցի պատասխանելու ամբողջ ժամանակը։',
      skill: 'Գիտելիքի նյութ կազմել, ձևանմուշներ պատրաստել, բացառությունները մշակել։',
      idea: '10 հաճախակի հարցի հաստատված պատասխաններից ստանալ պատասխանների սևագրեր։',
      solves: ['repeat', 'phrase', 'check'], goals: ['free', 'more', 'tired', 'quality', 'income'], income: ['time'], auto: 'Make',
    },
    T08: {
      label: 'Հաճախորդներ, պատվերներ կամ աշխատանք| գտնել', short: 'Հաճախորդներ կամ աշխատանք գտնել',
      headline: 'Գտեք հաճախորդներ հստակ առաջարկով',
      problem: 'Հաճախորդներ, պատվերներ կամ աշխատանք գտնելը ձեզնից շատ ժամանակ կամ ջանք է պահանջում։',
      action: 'Ստանում եք հստակ առաջարկ և անձնականացված հաղորդագրության սևագիր՝ միայն իրական փաստերով։',
      tool: 'AI օգնական',
      steps: ['Գրեք ձեր առաջարկը մեկ նախադասությամբ՝ ում համար է և ինչ խնդիր է լուծում։', 'Խնդրեք AI օգնականին պատրաստել հաղորդագրության սևագիր մեկ հնարավոր հաճախորդի համար։', 'Ստուգեք, ուղարկեք ինքներդ և գրանցեք պատասխանները։'],
      prompt: 'Իմ ծառայությունը՝ [լրացրեք]\nՈւմ համար է՝ [լրացրեք]\nԻրական օրինակներ կամ արդյունքներ՝ [լրացրեք]\nԳրի՛ր կարճ, անկեղծ հաղորդագրություն հնարավոր հաճախորդին՝ մինչև 80 բառ։ Մի՛ հորինիր արդյունքներ կամ թվեր։',
      check: 'Որ բոլոր պնդումներն իրական են և ապացուցելի։',
      measure: 'Ուղարկված առաջարկների և ստացված պատասխանների քանակը։',
      skill: 'Առաջարկը ձևակերպել, իրական ապացույցներ ներկայացնել։',
      idea: 'Հստակ առաջարկ և անձնականացված հաղորդագրության սևագիր։',
      solves: ['start', 'phrase', 'skill'], goals: ['income', 'more', 'learn'], income: ['clients', 'offer'],
      // the job-seeking version (Հ1 «Աշխատանք եմ փնտրում» or Ա3ա «ավելի լավ աշխատանք»)
      job: {
        headline: 'Պատրաստվեք աշխատանքի դիմումին',
        action: 'Իրական հայտարարությանը համապատասխանեցնում եք ձեր իրական փորձի վրա հիմնված CV-ն և փորձում հարցազրույցը։',
        steps: ['Վերցրեք մեկ իրական աշխատանքի հայտարարություն։', 'Խնդրեք համեմատել այն ձեր իրական փորձի հետ և առաջարկել CV-ի ուղղումներ։', 'Փորձեք հարցազրույց՝ խնդրելով 5 հավանական հարց։'],
        prompt: 'Ստորև աշխատանքի հայտարարությունն է և իմ իրական փորձը։\nԱռանձնացրու՛ հայտարարության հիմնական պահանջները և ցույց տուր՝ իմ փորձից որն է համապատասխանում։\nՄի՛ հորինիր փորձ կամ արդյունքներ։\nՀայտարարություն՝ [լրացրեք]\nԻմ փորձը՝ [լրացրեք]',
        check: 'Որ CV-ում ամեն ինչ իրական է՝ փորձը, թվերը, արդյունքները։',
        measure: 'Ուղարկված դիմումների և հարցազրույցների քանակը։',
        skill: 'Իրական փորձը ներկայացնել, հարցազրույցի պատրաստվել։',
      },
    },
    T09: {
      label: 'Գործեր, հանդիպումներ| կամ ժամկետներ կազմակերպել', short: 'Գործեր և ժամկետներ կազմակերպել',
      headline: 'Կազմակերպեք գործերն ու ժամկետները',
      problem: 'Գործեր, հանդիպումներ կամ ժամկետներ կազմակերպելը ձեզնից շատ ժամանակ կամ ջանք է պահանջում։',
      action: 'Ձեր գրառումներից ստանում եք առաջադրանքների և ժամկետների ցանկ, որը հաստատելուց հետո մուտքագրում եք օրացույց։',
      tool: 'AI օգնական և ձեր օրացույցը',
      steps: ['Գրեք ձեր գործերը կամ հանդիպման նշումները ազատ ձևով։', 'Խնդրեք կազմել առաջադրանքների ցանկ՝ ժամկետներով և պատասխանատուներով։', 'Ստուգեք ժամկետները և միայն հետո մուտքագրեք օրացույց։'],
      prompt: 'Ստորև իմ նշումներն են։\nԿազմի՛ր առաջադրանքների ցանկ՝ ով, ինչ, մինչև երբ։\nԵթե ժամկետ կամ պատասխանատու նշված չէ, գրի՛ր «ճշտել»։\nՆշումներ՝ [լրացրեք՝ առանց անձնական տվյալների]',
      check: 'Ժամկետները, պատասխանատուները և առաջնահերթությունները։',
      measure: 'Շաբաթվա պլանավորման ամբողջ ժամանակը և բաց թողնված ժամկետների քանակը։',
      skill: 'Առաջնահերթություններ դնել, պատասխանատուներ և ժամկետներ ստուգել։',
      idea: 'Գրառումներից ստանալ առաջադրանքների ցանկ՝ ժամկետներով։',
      solves: ['info', 'repeat', 'start'], goals: ['free', 'tired', 'more', 'quality'], income: ['time'], auto: 'Make',
    },
    T10: {
      label: 'Նույն տվյալները| տարբեր տեղերում լրացնել կամ տեղափոխել', short: 'Տվյալներ լրացնել կամ տեղափոխել',
      headline: 'Տեղափոխեք տվյալները քիչ ձեռքով',
      problem: 'Նույն տվյալները տարբեր տեղերում լրացնելը կամ տեղափոխելը ձեզնից շատ ժամանակ է խլում։',
      action: 'Նոր հարցումից առանձնացնում եք հստակ դաշտերը, գտնում պակասողները և պատրաստում հաստատման սևագիր։ Սկզբում՝ հորինված օրինակներով։',
      tool: 'AI օգնական և ձեր աղյուսակը',
      steps: ['Գրեք, թե որ դաշտերն են պետք յուրաքանչյուր նոր հարցման համար։', 'Հորինված օրինակով խնդրեք տեքստից հանել դաշտերը աղյուսակի տողի տեսքով և նշել պակասողները։', 'Ստուգեք և միայն հետո տեղափոխեք աղյուսակ։'],
      prompt: 'Ստորև հարցման տեքստն է։\nԱռանձնացրու՛ հետևյալ դաշտերը՝ [դաշտերի ցանկը]\nՊատասխանը տուր մեկ աղյուսակի տողի տեսքով։\nԵթե դաշտը տեքստում չկա, գրի՛ր «պակասում է» և մի՛ հորինիր։\nՏեքստ՝ [լրացրեք հորինված օրինակով]',
      check: 'Որ ոչ մի դաշտ չի հորինվել, և կրկնօրինակներ չկան։',
      measure: 'Մեկ հարցման մշակման ամբողջ ժամանակը և սխալների քանակը։',
      skill: 'Դաշտերը համապատասխանեցնել, կրկնօրինակներն ու սխալները վերահսկել։',
      idea: 'Տեքստից հանել անհրաժեշտ դաշտերը և նշել պակասողները։',
      note: 'Եթե բավարար են սովորական կանոնները կամ աղյուսակի բանաձևը, AI պարտադիր չէ։',
      solves: ['repeat', 'check'], goals: ['free', 'quality', 'tired', 'more'], income: ['time'], auto: 'Make',
    },
    T11: {
      label: 'Տան, ընտանիքի| կամ անձնական գործերը կազմակերպել', short: 'Անձնական գործերը կազմակերպել',
      headline: 'Կազմակերպեք անձնական գործերը հանգիստ',
      problem: 'Տան, ընտանիքի կամ անձնական գործերը կազմակերպելը ձեզնից շատ ժամանակ կամ ջանք է պահանջում։',
      action: 'Ձեր ժամանակի և նախասիրությունների հիման վրա ստանում եք իրատեսական պլան, գնումների ցանկ կամ տարբերակների համեմատություն։',
      tool: 'AI օգնական',
      steps: ['Գրեք մեկ օրվա գործերը, ազատ ժամերը և սահմանափակումները։', 'Խնդրեք կազմել իրատեսական ծրագիր։', 'Ուղղեք այն ըստ ձեզ և, եթե պետք է, ավելացրեք օրացույցում։'],
      prompt: 'Օգնի՛ր կազմել իրատեսական ծրագիր մեկ օրվա համար։\nԳործերը՝ [լրացրեք]\nԱզատ ժամերը՝ [լրացրեք]\nՍահմանափակումները՝ [լրացրեք]\nՉտեղավորվող գործերը նշի՛ր առանձին՝ առանց ծրագիրը ծանրաբեռնելու։',
      check: 'Որ ծրագիրն իրատեսական է ձեր ժամանակի համար։',
      measure: 'Պլանավորման ժամանակը և ավարտված գործերի քանակը։',
      skill: 'Սահմանափակումները նշել և պլանն իրատեսական դարձնել։',
      idea: 'Մեկ օրվա իրատեսական ծրագիր՝ ձեր ազատ ժամերով։',
      solves: ['start', 'info', 'phrase'], goals: ['free', 'tired', 'more'], income: [],
    },
    T12: {
      label: 'Ձեռքով կամ տեղում| կատարվող աշխատանք՝ վերանորոգում, խնամք, առաքում', short: 'Ձեռքով կամ տեղում կատարվող աշխատանք',
      headline: 'Հեշտացրեք ձեռքի աշխատանքի օժանդակ մասը',
      problem: 'Ձեռքով կամ տեղում կատարվող աշխատանքը ձեզնից շատ ժամանակ կամ ջանք է պահանջում։',
      action: 'AI-ը կարող է օգնել միայն օժանդակ մասին՝ նյութերի ցանկ, հերթականության պլան, պատվերի նկարագրություն կամ պատասխան հաճախորդին։',
      tool: 'AI օգնական՝ միայն օժանդակ մասի համար',
      steps: ['Ընտրեք գործի օժանդակ մասը՝ նյութերի ցանկ, հերթականություն, պատվերի նկարագրություն կամ պատասխան հաճախորդին։', 'Խնդրեք AI օգնականին պատրաստել դրա սևագիրը։', 'Չափերն ու անվտանգության պահանջները ստուգեք մասնագետի հետ։'],
      prompt: 'Օգնի՛ր պատրաստել [նյութերի ցանկ, աշխատանքի հերթականություն կամ պատվերի նկարագրություն]։\nԳործը՝ [լրացրեք]\nՊայմանները՝ [լրացրեք]\nՉափեր կամ անվտանգության կանոններ մի՛ հորինիր․ նշի՛ր, թե ինչը պետք է ճշտել մասնագետի հետ։',
      check: 'Չափերը և անվտանգության պահանջները՝ մասնագետի հետ։',
      measure: 'Պատրաստման ժամանակը և մոռացված մանրամասների քանակը։',
      skill: 'Օժանդակ մասը ձևակերպել և ստուգել։',
      idea: 'Աշխատանքի նյութերի ցանկ կամ հերթականության պլան։',
      note: 'Ֆիզիկական կատարումը սովորական AI հավելվածով չի ավտոմատացվում։',
      solves: ['start', 'phrase', 'info'], goals: ['free', 'tired', 'quality', 'more', 'income'], income: ['time', 'clients'],
    },
  };
  const TASK_IDS = Object.keys(TASKS);
  // No matching row (Այլ, a described or a new task): an honest, preliminary first step
  const CUSTOM = {
    headline: 'Ձեր գործի համար առաջարկը նախնական է',
    action: 'Ձեր նշած գործի համար պատրաստի համապատասխանություն դեռ չունենք։ Առաջին քայլը՝ պարզել, թե գործի որ մասում կարող է օգնել AI-ը, իսկ որը ավելի լավ է թողնել ձեզ։',
    tool: 'AI օգնական',
    steps: ['Նկարագրեք գործը՝ ինչից է սկսվում և ինչ պետք է պատրաստ լինի վերջում։', 'Խնդրեք AI օգնականին բաժանել այն քայլերի և նշել, թե որ քայլում կարող է օգնել։', 'Փորձեք միայն մեկ քայլ և համեմատեք ժամանակը։'],
    prompt: 'Ահա մի գործ, որը հաճախ եմ անում։\nԳործը՝ [լրացրեք]\nԻնչ պետք է ստանամ վերջում՝ [լրացրեք]\nԲաժանի՛ր այն քայլերի և նշի՛ր, թե որ քայլերում կարող է օգնել AI օգնականը, իսկ որոնք ավելի լավ է թողնել մարդուն։ Մի՛ հորինիր փաստեր իմ աշխատանքի մասին։',
    check: 'Որ առաջարկված քայլերն իրատեսական են ձեր պայմաններում։',
    measure: 'Ընտրված քայլի ամբողջ ժամանակը՝ առաջ և հետո։',
    skill: 'Հստակ առաջադրանք տալ և արդյունքը ստուգել։',
    solves: [], goals: [], income: [],
  };

  const LEVEL = { never: 0, tried: 0, uses: 1, builds: 2 };   // Հ9 → the starting level (a self-assessment, not proof)
  const BOTTLENECK_TEXT = {
    start: 'չգիտեք՝ ինչից սկսել', info: 'դժվար է կարևորն առանձնացնել', phrase: 'դժվար է միտքը հստակ ձևակերպել',
    repeat: 'նույն քայլերը շատ եք կրկնում', check: 'ստուգելն ու ուղղելը շատ ժամանակ է խլում', skill: 'պակասում է հմտությունը',
    wait: 'պետք է սպասեք ուրիշներին', physical: 'գործը հիմնականում ֆիզիկական է',
  };

  // The screens. kind: multi (checkboxes, `max`), single (radios), text (a free answer), time (hours and minutes).
  // Options: [value, label, extra] — extra.solo: an exclusive answer (shown under «կամ»), extra.field: a text box
  // for it, extra.excludes: values it can't be chosen with. `fields`: more boxes on the same screen, `when` decides.
  const Q = {
    q1: { block: 1, kind: 'multi', key: 'role', max: 2, title: 'Այս պահին ինչո՞վ եք հիմնականում զբաղվում։', hint: 'Ընտրեք մինչև 2 տարբերակ',
      options: [['work', 'Աշխատում եմ կազմակերպությունում'], ['biz', 'Ունեմ բիզնես կամ աշխատում եմ ինքնուրույն'], ['study', 'Սովորում եմ'], ['job', 'Աշխատանք եմ փնտրում'],
        ['home', 'Հիմնականում զբաղվում եմ տան և ընտանիքի գործերով'], ['retired', 'Թոշակառու եմ'], ['other', 'Այլ', { field: 'roleOther', placeholder: 'Գրեք ձեր տարբերակը' }]],
      fields: [{ key: 'occupation', label: 'Եթե ցանկանում եք, նշեք ձեր զբաղմունքը կամ ոլորտը', placeholder: 'Օրինակ՝ ուսուցիչ, վարորդ, վաճառող, հաշվապահ', max: 80 }] },
    q2: { block: 2, kind: 'multi', key: 'tasks', max: 3, title: 'Վերջին 30 օրում ո՞ր գործերն են ձեզնից շատ ժամանակ կամ ջանք պահանջել։', hint: 'Ընտրեք մինչև 3 տարբերակ',
      options: null /* built from TASKS in the respondent's order (07) */ },
    q2u: { block: 3, kind: 'text', key: 'unsureText', optional: true, title: 'Վերջին օրերին ո՞ր գործի վրա կուզենայիք ավելի քիչ ժամանակ կամ ջանք ծախսել։',
      hint: 'Կարող եք շարունակել առանց պատասխանի', placeholder: 'Գրեք մեկ գործ', max: 200 },
    q3: { block: 3, kind: 'single', key: 'primary', title: 'Ձեր ընտրած գործերից ո՞ր մեկն առաջինը կուզենայիք հեշտացնել։', options: null /* the tasks chosen in Հ2 */ },
    q4: { block: 4, kind: 'single', key: 'goal', title: 'Այդ գործը հեշտացնելու արդյունքում ամենից շատ ի՞նչ եք ուզում ստանալ։',
      options: [['free', 'Ավելի շատ ազատ ժամանակ'], ['more', 'Նույն ժամանակում ավելի շատ գործ հասցնել'], ['quality', 'Ավելի որակյալ արդյունք և քիչ սխալներ'], ['income', 'Ավելի շատ եկամուտ'],
        ['tired', 'Ավելի քիչ հոգնածություն ու լարվածություն'], ['learn', 'Նոր բան ինքնուրույն անել կամ սովորել'], ['other', 'Այլ', { field: 'goalOther', placeholder: 'Գրեք ձեր նպատակը' }]] },
    a3a: { block: 4, kind: 'single', key: 'incomePath', title: 'Ո՞ր ճանապարհով եք ուզում ավելացնել ձեր եկամուտը։',
      options: [['clients', 'Ավելի շատ հաճախորդներ կամ պատվերներ ունենալ'], ['faster', 'Նույն ժամանակում ավելի շատ պատվերներ կատարել'], ['new', 'Նոր ծառայություն կամ ապրանք առաջարկել'],
        ['job', 'Ավելի լավ աշխատանք գտնել կամ առաջադիմել'], ['unknown', 'Դեռ չգիտեմ']] },
    a3b: { block: 4, kind: 'single', key: 'incomeObstacle', title: 'Այդ ճանապարհին հիմա ո՞րն է գլխավոր խոչընդոտը։',
      options: [['few', 'Հաճախորդները կամ հնարավորությունները քիչ են'], ['time', 'Ժամանակս չի բավականացնում'], ['offer', 'Առաջարկս կամ աշխատանքի օրինակներս պատրաստ չեն'],
        ['skill', 'Պակասում է անհրաժեշտ հմտությունը'], ['other', 'Այլ', { field: 'incomeObstacleOther', placeholder: 'Գրեք խոչընդոտը' }], ['unknown', 'Դեռ չգիտեմ']] },
    q5: { block: 5, kind: 'text', key: 'example', optional: true, multiline: true, max: 400, title: 'Կարո՞ղ եք մեկ օրինակով նկարագրել այն գործը, որն ուզում եք հեշտացնել։',
      hint: 'Ընտրովի, մինչև 400 նիշ։ Ի՞նչ պետք է ստանայիք վերջում։', placeholder: 'Օրինակ՝ հաճախորդների նույն հարցերին ամեն օր առանձին պատասխանում եմ WhatsApp-ում',
      after: 'Մի՛ գրեք իրական նամակներ, մարդկանց անուններ կամ գաղտնի տվյալներ։' },
    q6a: { block: 6, kind: 'single', key: 'count', title: 'Վերջին 7 օրում մոտ քանի՞ անգամ եք արել այս գործը։',
      options: [['0', '0'], ['1', '1'], ['2-5', '2–5'], ['6-10', '6–10'], ['11-20', '11–20'], ['21+', '21 և ավելի'], ['unknown', 'Չեմ հիշում']],
      fields: [{ key: 'countExact', label: 'Եթե գիտեք, նշեք ճշգրիտ թիվը (ընտրովի)', placeholder: 'Օրինակ՝ 4', numeric: true, when: (a) => filled(a.count) && a.count !== 'unknown' && a.count !== '0' }] },
    q6b: { block: 6, kind: 'time', key: 'time', title: 'Վերջին 7 օրում այս գործի վրա ընդհանուր մոտ որքա՞ն ժամանակ եք ծախսել։',
      hint: 'Հաշվեք միայն ձեր ծախսած ժամանակը՝ ներառյալ ստուգումն ու ուղղումները։ Ուրիշների պատասխանին սպասելը մի՛ ներառեք, եթե այդ ընթացքում այլ գործ եք արել։' },
    q6r: { block: 6, kind: 'single', key: 'rare', title: 'Սա հազվադե՞պ եք անում, թե՞ ուզում եք նոր սկսել։',
      options: [['rare', 'Հազվադեպ եմ անում'], ['start', 'Ուզում եմ սկսել'], ['other', 'Այլ']],
      fields: [{ key: 'rareTime', label: 'Վերջին անգամ մոտ որքա՞ն ժամանակ ծախսեցիք (ընտրովի)', placeholder: 'Օրինակ՝ 2 ժամ', max: 40, when: (a) => a.rare === 'rare' }] },
    q7: { block: 7, kind: 'multi', key: 'bottlenecks', max: 2, title: 'Այս գործի ո՞ր մասն է ամենից շատ դժվարացնում աշխատանքը։', hint: 'Ընտրեք մինչև 2 տարբերակ',
      options: [['start', 'Չգիտեմ՝ ինչից սկսել| կամ ինչպես անել'], ['info', 'Շատ տեղեկություն կա|, դժվար է կարևորն առանձնացնել'], ['phrase', 'Դժվար է միտքս| հստակ ձևակերպել'],
        ['repeat', 'Նույն քայլերը| շատ եմ կրկնում'], ['check', 'Ստուգելու և ուղղելու| վրա շատ ժամանակ է գնում'], ['skill', 'Պակասում է| անհրաժեշտ հմտությունը'],
        ['wait', 'Պետք է սպասեմ| ուրիշ մարդկանց'], ['physical', 'Ֆիզիկական աշխատանք| է պահանջում'], ['other', 'Այլ', { field: 'bottleneckOther', placeholder: 'Գրեք՝ ինչն է դժվարացնում' }],
        ['unsure', 'Չեմ կողմնորոշվում', { solo: true }]] },
    q8a: { block: 8, kind: 'multi', key: 'apps', title: 'Այս գործը հիմա որտե՞ղ կամ ինչո՞վ եք անում։', hint: 'Նշեք բոլոր կիրառելիները',
      options: [['email', 'Էլեկտրոնային փոստ'], ['msg', 'WhatsApp, Telegram կամ Viber'], ['social', 'Facebook կամ Instagram'], ['docs', 'Word կամ Google Docs'], ['sheets', 'Excel կամ Google Sheets'],
        ['calendar', 'Օրացույց կամ առաջադրանքների ծրագիր'], ['org', 'Կազմակերպության հատուկ ծրագիր'], ['paper', 'Թղթով կամ ձեռքով'], ['other', 'Այլ', { field: 'appsOther', placeholder: 'Գրեք՝ որտեղ' }],
        ['none', 'Դեռ չեմ անում', { solo: true }]],
      fields: [{ key: 'appName', label: 'Ծրագրի անունը (ընտրովի)', placeholder: 'Օրինակ՝ 1C, Trello', max: 60, when: (a) => has(a.apps, 'org') || has(a.apps, 'calendar') }] },
    q8b: { block: 8, kind: 'multi', key: 'inputs', title: 'Գործի համար անհրաժեշտ նյութերը հիմնականում ինչպիսի՞ն են։', hint: 'Նշեք բոլոր կիրառելիները',
      options: [['digital', 'Թվային տեքստեր կամ աղյուսակներ'], ['photos', 'Լուսանկարներ կամ սկաներ'], ['media', 'Ձայնագրություններ կամ տեսանյութեր'], ['paper', 'Թղթային նյութեր'],
        ['create', 'Նյութերը դեռ պետք է ստեղծել'], ['physical', 'Հիմնականում ֆիզիկական գործ է'], ['other', 'Այլ'], ['unknown', 'Չգիտեմ', { solo: true }]] },
    a1: { block: 8, kind: 'single', key: 'a1', title: 'Այս գործը սովորաբար նույն քայլերով ու նույն կանոններո՞վ եք անում։',
      options: [['yes', 'Հիմնականում այո'], ['partly', 'Մասամբ'], ['no', 'Հիմնականում ոչ'], ['unknown', 'Չգիտեմ']],
      fields: [{ key: 'a1Text', label: 'Ի՞նչն է սկսում գործը, և ի՞նչ պետք է պատրաստ լինի վերջում (ընտրովի)', placeholder: 'Օրինակ՝ ձևը լրացվում է, տվյալները գրանցում եմ աղյուսակում և պատասխան եմ պատրաստում', max: 300, multiline: true, when: (a) => a.a1 === 'yes' || a.a1 === 'partly' }] },
    a2: { block: 8, kind: 'single', key: 'a2', title: 'Կարո՞ղ եք թույլտվությամբ նոր գործիք կապել ձեր օգտագործած ծրագրերին։',
      options: [['self', 'Այո, կարող եմ ինքս'], ['ask', 'Պետք է ուրիշի թույլտվությունը'], ['no', 'Չի թույլատրվում'], ['unknown', 'Չգիտեմ']] },
    q9: { block: 9, kind: 'single', key: 'level', title: 'Ո՞ր տարբերակն է լավագույնս նկարագրում AI գործիքներից օգտվելու ձեր փորձը։',
      options: [['never', 'Դեռ չեմ օգտվել'], ['tried', 'Փորձել եմ, բայց հաճախ չեմ ստանում ինձ պետք եղած արդյունքը'], ['uses', 'Կոնկրետ գործերի համար օգտվում եմ և կարողանում եմ ստուգել արդյունքը'],
        ['builds', 'Արդեն ստեղծել եմ բազմաքայլ աշխատանքային ընթացք կամ ավտոմատացում']],
      fields: [{ key: 'tools', label: 'Ո՞ր գործիքներն եք արդեն օգտագործում (ընտրովի)', placeholder: 'Օրինակ՝ ChatGPT, Gemini', max: 80, when: (a) => filled(a.level) && a.level !== 'never' }] },
    q10: { block: 10, kind: 'single', key: 'device', title: 'Ի՞նչ սարքով կարող եք օգտվել առաջարկվող գործիքներից։',
      options: [['phone', 'Միայն հեռախոսով'], ['pc', 'Միայն համակարգչով'], ['both', 'Երկուսով էլ'], ['none', 'Մշտական հասանելիություն չունեմ']] },
    q11: { block: 11, kind: 'single', key: 'budget', title: 'AI գործիքների համար վճարելու ո՞ր տարբերակն է ձեզ հարմար։', hint: 'Սա վերաբերում է գործիքներին, ոչ թե դասընթացի վճարին',
      options: [['free', 'Ուզում եմ սկսել միայն անվճար գործիքներից'], ['paid', 'Կարող եմ վճարել, եթե օգուտը հասկանալի լինի'], ['unknown', 'Դեռ չեմ կողմնորոշվել']],
      fields: [{ key: 'budgetAmount', label: 'Ամսական առավելագույն գումարը և արժույթը (ընտրովի)', placeholder: 'Օրինակ՝ 5000 դրամ', max: 40, when: (a) => a.budget === 'paid' }] },
    q12a: { block: 12, kind: 'multi', key: 'langs', title: 'Հավելվածների հրահանգներից և ընտրացանկերից ո՞ր լեզուներով կարող եք օգտվել։',
      hint: 'Նշեք բոլոր կիրառելիները։ Առաջարկները միշտ հայերեն են։',
      options: [['hy', 'Հայերեն'], ['ru', 'Ռուսերեն'], ['en', 'Անգլերեն'], ['other', 'Այլ', { field: 'langOther', placeholder: 'Գրեք լեզուն' }]] },
    q12b: { block: 12, kind: 'multi', key: 'constraints', title: 'Ի՞նչ սահմանափակում պետք է հաշվի առնենք։', hint: 'Նշեք բոլոր կիրառելիները',
      options: [['cannot', 'Չեմ կարող աշխատանքային կամ անձնական տվյալները փոխանցել արտաքին գործիքի', { excludes: ['dontknow'] }],
        ['dontknow', 'Չգիտեմ՝ թույլատրվո՞ւմ է այդ տվյալները փոխանցել', { excludes: ['cannot'] }],
        ['help', 'Նոր հավելվածներ սովորելիս օգնության կարիք ունեմ'], ['offline', 'Ինտերնետը միշտ հասանելի չէ'],
        ['other', 'Այլ', { field: 'constraintOther', placeholder: 'Գրեք սահմանափակումը' }], ['none', 'Հատուկ սահմանափակում չունեմ', { solo: true }]],
      last: true },
  };

  /* ---------- 03 · Flow ---------- */
  let a = {};          // the answers
  let history = [];    // the screens shown, for «Հետ»
  let order = [];      // Հ2's task order for this respondent (shuffled once, kept)
  let respondentId = '';

  const primaryKnown = () => !(a.taskSolo === 'unsure' && !filled(a.unsureText));
  const primaryId = () => {
    if (a.taskSolo === 'unsure') return filled(a.unsureText) ? 'custom' : null;
    if (a.taskSolo === 'notyet') return 'new';
    const tasks = a.tasks || [];
    if (tasks.length === 1) return tasks[0];
    return a.primary || null;
  };
  const isDigital = () => ['digital', 'photos', 'media'].some((v) => has(a.inputs, v)) || (a.apps || []).some((v) => !['paper', 'none'].includes(v));

  // The screens this respondent sees, in order, given the answers so far
  function steps() {
    const s = ['q1', 'q2'];
    if (a.taskSolo === 'unsure') s.push('q2u');
    else if (!a.taskSolo && (a.tasks || []).length > 1) s.push('q3');
    if (primaryKnown()) {
      s.push('q4');
      if (a.goal === 'income') s.push('a3a', 'a3b');
      s.push('q5');
      if (primaryId() !== 'new') s.push('q6a', a.count === '0' ? 'q6r' : 'q6b');
      s.push('q7', 'q8a', 'q8b');
      const p = primaryId();
      if (has(a.bottlenecks, 'repeat') || ['T07', 'T09', 'T10'].includes(p)) {
        s.push('a1');
        if ((a.a1 === 'yes' || a.a1 === 'partly') && isDigital()) s.push('a2');
      }
    }
    s.push('q9', 'q10', 'q11', 'q12a', 'q12b');
    return s;
  }

  /* ---------- 04 · Screens ---------- */
  function optionsFor(id) {
    const q = Q[id];
    if (id === 'q2') {
      return [...order.map((t) => [t, TASKS[t].label]),
        ['other', 'Այլ', { field: 'taskOther', placeholder: 'Գրեք ձեր գործը', always: true }],
        ['unsure', 'Չեմ կողմնորոշվում', { solo: true }],
        ['notyet', 'Դեռ չեմ անում|, բայց ուզում եմ սկսել', { solo: true, field: 'notyetText', placeholder: 'Ի՞նչ գործ եք ուզում սկսել' }]];
    }
    if (id === 'q3') {
      return (a.tasks || []).map((t) => [t, t === 'other' ? (filled(a.taskOther) ? `Այլ՝ ${a.taskOther.trim()}` : 'Այլ') : TASKS[t].label]);
    }
    return q.options;
  }
  // A multi question's answers live in a[key] plus, for Հ2, the exclusive answer in a.taskSolo
  function chosen(id) {
    const q = Q[id];
    if (id === 'q2') return [...(a.tasks || []), ...(a.taskSolo ? [a.taskSolo] : [])];
    if (q.kind === 'multi') return a[q.key] || [];
    return a[q.key] ? [a[q.key]] : [];
  }
  function setChosen(id, values) {
    const q = Q[id];
    if (id === 'q2') {
      const solo = values.find((v) => v === 'unsure' || v === 'notyet') || null;
      a.taskSolo = solo;
      a.tasks = solo ? [] : values;
      if (a.primary && !a.tasks.includes(a.primary)) a.primary = null;
      return;
    }
    if (q.kind === 'multi') a[q.key] = values; else a[q.key] = values[0] || null;
  }

  function valid(id) {
    const q = Q[id];
    if (q.optional) return true;
    if (q.kind === 'time') return a.timeUnknown || (Number(a.hours || 0) * 60 + Number(a.minutes || 0)) > 0;
    const picked = chosen(id);
    if (!picked.length) return false;
    if (id === 'q2' && a.taskSolo === 'notyet' && !filled(a.notyetText)) return false;   // the new task is the primary one: it needs its words
    return true;
  }
  // Answers that contradict each other: ask to fix only that field, never change it ourselves
  function problem(id) {
    if (id === 'q6a' && filled(a.countExact)) {
      const n = Number(a.countExact);
      const ranges = { '1': [1, 1], '2-5': [2, 5], '6-10': [6, 10], '11-20': [11, 20], '21+': [21, Infinity] };
      const r = ranges[a.count];
      if (!Number.isInteger(n) || n < 0) return 'Ճշգրիտ թիվը պետք է լինի ամբողջ թիվ։';
      if (r && (n < r[0] || n > r[1])) return 'Ճշգրիտ թիվը չի համապատասխանում ընտրված տարբերակին․ ուղղեք մեկը։';
    }
    if (id === 'q6b' && !a.timeUnknown) {
      const h = Number(a.hours || 0), m = Number(a.minutes || 0);
      if (h > 168 || m > 59 || h < 0 || m < 0) return 'Ստուգեք ժամերն ու րոպեները (շաբաթում առավելագույնը 168 ժամ, րոպեները՝ մինչև 59)։';
    }
    return '';
  }

  function choiceRow(name, type, value, label, checked, round = false) {
    return `<label class="choice${round ? ' choice--radio' : ''}">
      <input type="${type}" name="${name}" value="${esc(value)}"${checked ? ' checked' : ''} />
      <span class="choice__text">${labelHtml(label)}</span>
      <span class="choice__box" aria-hidden="true"><i class="ic ic--check"></i></span>
    </label>`;
  }
  function textField(key, { label = '', placeholder = '', max = 200, multiline = false, numeric = false } = {}, extraClass = '') {
    const value = esc(a[key] || '');
    const attrs = `class="field__input" data-field="${key}" placeholder="${esc(placeholder)}" maxlength="${max}"${label ? '' : ` aria-label="${esc(placeholder)}"`}`;
    const input = multiline ? `<textarea ${attrs} rows="4">${value}</textarea>`
      : `<input ${attrs} type="text" value="${value}"${numeric ? ' inputmode="numeric" pattern="[0-9]*"' : ''} />`;
    return label ? `<label class="field ${extraClass}"><span class="field__label">${esc(label)}</span>${input}</label>` : `<div class="${extraClass}">${input}</div>`;
  }

  let current = null;
  function render(id, { keepScroll = false } = {}) {
    current = id;
    const q = Q[id];
    const list = steps();
    const pos = Math.max(0, list.indexOf(id));
    const fill = Math.round(((pos + 1) / (list.length + 1)) * 100);
    const name = `q-${id}`;
    let body = '';

    if (q.kind === 'multi' || q.kind === 'single') {
      const opts = optionsFor(id);
      const picked = chosen(id);
      const type = q.kind === 'multi' ? 'checkbox' : 'radio';
      const rows = (subset, round) => subset.map(([v, label, extra = {}]) => {
        let html = choiceRow(name, type, v, label, picked.includes(v), round || type === 'radio');
        if (extra.field && (extra.always || picked.includes(v))) html += textField(extra.field, { placeholder: extra.placeholder, max: 120 }, 'survey__extra');
        return html;
      }).join('');
      const main = opts.filter(([, , e = {}]) => !e.solo);
      const solo = opts.filter(([, , e = {}]) => e.solo);
      const full = q.max && picked.filter((v) => !solo.some(([s]) => s === v)).length >= q.max;
      body += `<div class="choices${full ? ' is-full' : ''}" data-group>${rows(main, false)}</div>`;
      if (solo.length) body += `<p class="survey__or">կամ</p><div class="choices" data-group>${rows(solo, true)}</div>`;
    } else if (q.kind === 'text') {
      body += `<div class="survey__group">${textField(q.key, { placeholder: q.placeholder, max: q.max, multiline: q.multiline })}</div>`;
      if (q.after) body += `<p class="survey__small">${esc(q.after)}</p>`;
    } else if (q.kind === 'time') {
      const unit = (key, u, max) => `<label class="field__group"><input class="field__input field__input--grouped" data-field="${key}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="${max}" value="${esc(a[key] || '')}" aria-label="${u}"${a.timeUnknown ? ' disabled' : ''} /><span class="field__prefix">${u}</span></label>`;
      body += `<div class="survey__group survey__time">${unit('hours', 'ժամ', 3)}${unit('minutes', 'րոպե', 2)}</div>`;
      body += `<p class="survey__or">կամ</p><div class="choices" data-group>${choiceRow(name, 'checkbox', 'unknown', 'Չեմ կարող գնահատել', !!a.timeUnknown, true)}</div>`;
    }
    for (const f of q.fields || []) if (!f.when || f.when(a)) body += textField(f.key, f, 'survey__group');

    const isLast = q.last;
    screens.question.innerHTML = `
      <div class="survey__nav">
        <button type="button" class="survey__back" data-back${history.length ? '' : ' hidden'}>← Հետ</button>
        <span>${q.block} / 12</span>
      </div>
      <div class="survey__progress" role="progressbar" aria-label="Առաջընթաց" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${fill}"><span class="survey__progress-fill"></span></div>
      <h1 class="survey__title" tabindex="-1">${esc(q.title)}</h1>
      ${q.hint ? `<p class="survey__hint">${esc(q.hint)}</p>` : ''}
      <form data-form novalidate>${body}<p class="survey__error" data-error hidden></p></form>
      <div class="survey__dock"><div class="survey__dock-in">
        <p class="survey__note" data-note role="status" hidden></p>
        <button type="button" class="btn btn--primary btn--md btn--block" data-next>${isLast ? 'Տեսնել իմ առաջարկները' : 'Շարունակել'}</button>
      </div></div>`;
    screens.question.querySelector('.survey__progress-fill').style.setProperty('--fill', `${fill}%`);
    show('question');
    refresh();
    if (!keepScroll) { window.scrollTo(0, 0); screens.question.querySelector('.survey__title').focus({ preventScroll: true }); }
  }

  // Updates the parts that don't need a redraw: the button (state and «· 2/3»), the limit note, the error line
  function refresh() {
    const q = Q[current];
    const btn = screens.question.querySelector('[data-next]');
    const ok = valid(current);
    btn.disabled = !ok;
    if (!q.last && q.max) {
      const n = chosen(current).filter((v) => !['unsure', 'notyet', 'none', 'unknown'].includes(v)).length;
      btn.innerHTML = n ? `Շարունակել <span class="survey__count">· ${n}/${q.max}</span>` : 'Շարունակել';
    }
    const err = screens.question.querySelector('[data-error]');
    const msg = problem(current);
    err.textContent = msg; err.hidden = !msg;
  }
  function note(text) {
    const el = screens.question.querySelector('[data-note]');
    el.textContent = text || ''; el.hidden = !text;
  }

  function onChoice(input) {
    const q = Q[current];
    if (current === 'q6b') { a.timeUnknown = input.checked; if (a.timeUnknown) { a.hours = ''; a.minutes = ''; } save(); return render(current, { keepScroll: true }); }
    const opts = optionsFor(current);
    const meta = Object.fromEntries(opts.map(([v, , e = {}]) => [v, e]));
    const v = input.value;
    let values = chosen(current);
    if (q.kind === 'single') values = [v];
    else if (input.checked) {
      const isSolo = meta[v]?.solo;
      if (isSolo) values = [v];
      else {
        values = values.filter((x) => !meta[x]?.solo && !(meta[v]?.excludes || []).includes(x));
        const counted = values.length;
        if (q.max && counted >= q.max) {
          input.checked = false;
          return note(`Արդեն ընտրել եք ${q.max}-ը։ Հանեք մեկը՝ ուրիշն ընտրելու համար։`);
        }
        values.push(v);
      }
    } else values = values.filter((x) => x !== v);
    note('');
    setChosen(current, values);
    save();
    render(current, { keepScroll: true });
  }
  function onField(input) {
    const key = input.dataset.field;
    a[key] = input.value;
    // typing in «Այլ»'s box chooses «Այլ»
    const owner = optionsFor(current)?.find(([, , e = {}]) => e.field === key);
    if (owner && filled(input.value) && !chosen(current).includes(owner[0])) {
      const box = screens.question.querySelector(`input[value="${owner[0]}"]`);
      if (box && Q[current].kind === 'multi' && !(Q[current].max && chosen(current).length >= Q[current].max)) {
        box.checked = true;
        setChosen(current, [...chosen(current).filter((x) => !optionsFor(current).find(([v, , e = {}]) => v === x && e.solo)), owner[0]]);
      }
    }
    save();
    refresh();
  }

  function next() {
    if (!valid(current) || problem(current)) return refresh();
    const list = steps();
    const i = list.indexOf(current);
    history.push(current);
    if (i === list.length - 1) { save(); return showResult(true); }
    go(list[i + 1]);
  }
  function back() {
    const prev = history.pop();
    if (!prev) return showIntro();
    save();
    render(prev);
  }
  function go(id) { save(); render(id); try { window.history.pushState({ s: id }, ''); } catch (e) { /* history is optional */ } }

  function show(name) { for (const [k, el] of Object.entries(screens)) el.hidden = k !== name; }
  function showIntro() { current = null; show('intro'); window.scrollTo(0, 0); }

  screens.question.addEventListener('change', (e) => { if (e.target.matches('.choice input')) onChoice(e.target); });
  screens.question.addEventListener('input', (e) => { if (e.target.matches('[data-field]')) onField(e.target); });
  screens.question.addEventListener('click', (e) => {
    if (e.target.closest('[data-next]')) next();
    if (e.target.closest('[data-back]')) back();
  });
  screens.question.addEventListener('submit', (e) => { e.preventDefault(); next(); });
  // a tap on a faded row once the limit is reached still explains why
  screens.question.addEventListener('click', (e) => {
    const row = e.target.closest('.choices.is-full .choice');
    if (row && !row.querySelector('input').checked && Q[current]?.max) { e.preventDefault(); note(`Արդեն ընտրել եք ${Q[current].max}-ը։ Հանեք մեկը՝ ուրիշն ընտրելու համար։`); }
  });

  /* ---------- 05 · Result ---------- */
  const level = () => LEVEL[a.level] ?? null;
  const dataBlocked = () => has(a.constraints, 'cannot') || has(a.constraints, 'dontknow');

  // The two ways to start on the same task, scored as the survey document sets out: S = 20M + 12.5G + 10R + 7.5E
  // (each 0–2). Automation is never the first step: it shows as a candidate note when its conditions are met.
  function choose(task) {
    const cands = [
      { id: 'assist', need: 0, setup: 2, solves: task.solves },
      { id: 'template', need: 1, setup: 1, solves: ['repeat', 'check', 'phrase'] },
    ];
    const lv = level();
    const goal = a.goal;
    const knownBottlenecks = (a.bottlenecks || []).filter((b) => b !== 'unsure' && b !== 'other');
    const incomeType = { few: 'clients', time: 'time', offer: 'offer', skill: 'skill' }[a.incomeObstacle] || (a.incomePath === 'job' ? 'job' : null);
    for (const c of cands) {
      c.M = knownBottlenecks.length ? (c.solves.some((b) => knownBottlenecks.includes(b)) ? 2 : 1) : null;
      if (goal === 'income') c.G = incomeType ? ((task.income || []).includes(incomeType) || (incomeType === 'time' && c.id === 'template') ? 2 : 1) : null;
      else c.G = !goal || goal === 'other' ? null : ((task.goals || []).includes(goal) ? 2 : 1);
      const over = lv === null ? null : c.need - lv;
      c.R = over === null ? null : over <= 0 ? 2 : over === 1 ? 1 : 0;
      c.E = c.setup;
      c.S = [c.M, c.G, c.R].includes(null) ? null : 20 * c.M + 12.5 * c.G + 10 * c.R + 7.5 * c.E;
    }
    // unknown parts: no total score; rank by M, then E (the simpler start)
    const scored = cands.every((c) => c.S !== null);
    cands.sort((x, y) => scored ? (y.S - x.S) || (y.E - x.E) : ((y.M ?? 1) - (x.M ?? 1)) || (y.E - x.E));
    return cands[0];
  }
  function automationOk(taskId) {
    const t = TASKS[taskId];
    if (!t?.auto) return false;
    if (!(a.a1 === 'yes' || a.a1 === 'partly')) return false;
    if (!(a.a2 === 'self' || a.a2 === 'ask')) return false;
    if (dataBlocked()) return false;
    if (a.device === 'phone' && (level() ?? 0) === 0) return false;   // never a beginner's first task on a phone only
    return true;
  }

  const promptHtml = (text) => esc(text).replace(/\[[^\]]+\]/g, (m) => `<mark>${m}</mark>`);
  const sec = (head, html) => `<div class="result__sec"><h2 class="result__head">${esc(head)}</h2>${html}</div>`;
  const para = (text) => `<p class="result__text">${esc(text)}</p>`;

  function baselineText() {
    if (primaryId() === 'new' || a.rare === 'start') return 'Նոր գործի դեպքում սկզբնական չափում չկա․ գրանցեք առաջին երեք փորձերի ժամանակը։';
    if (a.count === '0' && a.rare === 'rare') return filled(a.rareTime) ? `Սա հազվադեպ եք անում․ վերջին անգամ ծախսել եք մոտ ${a.rareTime.trim()}։` : 'Սա հազվադեպ եք անում․ հաջորդ անգամ գրանցեք ամբողջ ժամանակը։';
    if (a.timeUnknown || a.count === 'unknown') return 'Ժամանակը դեռ հայտնի չէ․ առաջարկում ենք մեկ շաբաթ չափել, թե որքան ժամանակ է գնում այս գործի վրա։';
    const h = Number(a.hours || 0), m = Number(a.minutes || 0);
    if (!h && !m) return '';
    const t = [h ? `${h} ժամ` : '', m ? `${m} րոպե` : ''].filter(Boolean).join(' ');
    return `Անցած 7 օրում այս գործի վրա ծախսել եք մոտ ${t}։`;
  }
  function incomeText() {
    if (a.goal !== 'income') return '';
    if (a.incomePath === 'job') return 'Համապատասխանեցրեք իրական փորձը ներկայացնող CV-ն իրական հայտարարությանը և փորձեք հարցազրույցը։';
    if (a.incomePath === 'new') return 'Պատրաստեք ցուցադրական օրինակ և ստուգեք պահանջարկը՝ մինչև մեծ ներդրում անելը։';
    if (a.incomeObstacle === 'few') return 'Պատրաստեք և փորձարկեք հստակ առաջարկ ու հաղորդագրություն։';
    if (a.incomeObstacle === 'time') return 'Պարզեցրեք պատվերի կատարման մեկ կոնկրետ քայլը։';
    if (a.incomeObstacle === 'offer') return 'Պատրաստեք ձեր առաջարկը և աշխատանքի մեկ իրական օրինակ։';
    if (a.incomeObstacle === 'skill') return 'Սկսեք պակասող հմտությունից․ ստորև՝ ինչ սովորել։';
    return 'Կատարեք մեկ հմտության և հնարավոր հաճախորդի փոքր հետազոտություն՝ առանց եկամտային կանխատեսման։';
  }
  function cautions(task) {
    const out = [];
    if (dataBlocked()) out.push('Փորձեք միայն հորինված կամ թույլատրելի, ապանձնավորված օրինակով։ Ապանձնավորումը ինքնին կազմակերպության թույլտվություն չի նշանակում։');
    if (a.budget === 'free') out.push('Սկսեք ձեր հաշվին հասանելի անվճար տարբերակից՝ նախ ստուգելով դրա սահմանաչափերը։');
    if (has(a.constraints, 'help')) out.push('Առաջին փորձն արեք մեկի հետ, ով արդեն օգտվում է այս գործիքից։');
    if (has(a.constraints, 'offline') || a.device === 'none') out.push('Պատրաստի հարցումը պահեք հեռախոսում, որ ինտերնետ ունենալիս անմիջապես փորձեք։');
    if (a.langs && !has(a.langs, 'en')) out.push('Գործիքի ընտրացանկը կարող է հայերեն չլինել։ Հարցումը կարող եք գրել հայերեն, բայց պատասխանի որակը նախապես փորձարկեք։');
    if (has(a.bottlenecks, 'wait')) out.push('Եթե գործը հիմնականում ուրիշների որոշմանը սպասելն է, AI-ը կարող է օգնել միայն հարցումը հստակեցնել կամ հիշեցում պատրաստել։');
    if (task?.note) out.push(task.note);
    return out;
  }
  function learning(autoNote) {
    const lv = level();
    if (autoNote && lv >= 1) return 'Ավտոմատացման կառուցում, փորձարկում և սխալների մշակում։';
    if (lv === 0) return 'AI-ի հիմքեր, հստակ հարցումներ և արդյունքի ստուգում։';
    if (lv === 1) return 'Բազմաքայլ աշխատանք, ձևանմուշներ և աղբյուրների հետ աշխատանք։';
    return 'Ինքնուրույն փորձարկման քայլեր․ դասընթաց պարտադիր չէ։';
  }

  function recommendation() {
    const pid = primaryId();
    if (!pid) return generalResult();
    const known = TASKS[pid];
    const isJob = pid === 'T08' && (has(a.role, 'job') || a.incomePath === 'job');
    const task = known ? (isJob ? { ...known, ...known.job } : known) : CUSTOM;
    const pick = known ? choose(task) : { id: 'assist' };
    const auto = known && automationOk(pid);

    const own = (pid === 'custom' ? a.unsureText : pid === 'new' ? a.notyetText : a.taskOther || '').trim();
    let problemText = known ? task.problem : own ? `Ձեր նշած գործը՝ «${own}»։` : 'Ձեր նշած գործը դեռ նկարագրված չէ։';
    const ctx = [];
    if (a.device === 'phone') ctx.push('օգտվում եք հեռախոսից');
    if (a.budget === 'free') ctx.push('ուզում եք սկսել անվճար տարբերակից');
    const bn = (a.bottlenecks || []).map((b) => BOTTLENECK_TEXT[b]).filter(Boolean);
    if (bn.length) ctx.unshift(`ամենից շատ խանգարում է, որ ${bn.join(' և ')}`);
    if (ctx.length) problemText += ` ${ctx.join(', ').replace(/^./, (c) => c.toUpperCase())}։`;
    const base = baselineText();

    let tool = task.tool;
    if (filled(a.tools) && /^AI օգնական/.test(tool)) tool = `${tool}․ կարող եք օգտագործել արդեն ծանոթ գործիքը՝ ${a.tools.trim()}`;
    const steps = pick.id === 'template'
      ? ['Ընտրեք այս գործի ամենահաճախ կրկնվող տարբերակը։', 'Ստորև հարցումը պահեք որպես ձևանմուշ՝ փոփոխվող մասերը թողնելով [ ]-ում։', 'Ամեն անգամ լրացրեք միայն փոփոխվողը և ստուգեք արդյունքը։']
      : task.steps;

    let html = `<img class="survey__logo" src="assets/logos/trademark.svg" alt="AI քեզ բան" />
      <h1 class="survey__title" tabindex="-1">${esc(task.headline)}</h1>`;
    if (!known) html += `<p class="survey__hint">Առաջարկը նախնական է</p>`;
    html += sec('Ձեր նշած խնդիրը', para(problemText) + (filled(a.example) ? para(`Ձեր օրինակը՝ «${a.example.trim()}»`) : '') + (base ? para(base) : ''));
    html += sec('Ինչ կարող եք անել AI-ի օգնությամբ', para(task.action));
    html += sec('Ինչից սկսել', para(`Գործիքը՝ ${tool}`) + `<ol class="result__list">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`);
    html += sec('Պատրաստի հարցում', `<div class="result__prompt" data-prompt>${promptHtml(task.prompt)}</div>
      <button type="button" class="btn btn--primary btn--md btn--block result__copy" data-copy>Պատճենել հարցումը</button>`);
    html += sec('Ինչը ստուգել ինքնուրույն', para(task.check));
    const measure = a.goal === 'income'
      ? 'Չափեք եկամտին տանող արդյունքը՝ ուղարկված առաջարկներ, որակյալ հարցումներ, պատվերներ, ավարտված աշխատանք կամ հարցազրույցներ։'
      : `${task.measure} Փորձեք երեք համադրելի իրական առաջադրանքի վրա՝ չափելով ամբողջ ժամանակը, ներառյալ ստուգումն ու ուղղումները։`;
    html += sec('Ինչպես չափել օգուտը', para(measure));
    const inc = incomeText();
    if (inc) html += sec('Եկամտի համար', para(inc));
    if (auto) html += sec('Ավտոմատացման թեկնածու', para(`Միացումները պետք է ստուգել։ Նախ մի քանի շաբաթ աշխատեք ձեռքով՝ վերը նշված ձևանմուշով։ Հետո կարելի է գնահատել ${task.auto}-ով միացումը՝ նոր հարցում → դաշտերի ստուգում → գրանցում աղյուսակում → պատասխանի սևագիր → ձեր հաստատումը → ուղարկում։`));
    const warn = cautions(task);
    if (warn.length) html += sec('Նկատի ունեցեք', warn.map(para).join(''));
    html += sec('Ինչ սովորել հաջորդը', para(task.skill) + para(`Ուսուցման ուղղությունը՝ ${learning(auto)}`));
    html += ideas(pid);
    return html;
  }
  function generalResult() {
    let html = `<img class="survey__logo" src="assets/logos/trademark.svg" alt="AI քեզ բան" />
      <h1 class="survey__title" tabindex="-1">Սկսենք մի փոքր փորձից</h1>
      <p class="survey__hint">Ձեր անհատական կարիքը դեռ չի որոշվել, ուստի ստորև ընդհանուր գաղափարներ են</p>`;
    const warn = cautions(null);
    if (warn.length) html += sec('Նկատի ունեցեք', warn.map(para).join(''));
    html += sec('Ինչ սովորել հաջորդը', para(`Ուսուցման ուղղությունը՝ ${learning(false)}`));
    html += ideaList(['T01', 'T02', 'T11'], 'Փորձելու գաղափարներ');
    return html;
  }
  // Up to two more of the tasks chosen in Հ2: a preliminary idea each, no time savings promised
  function ideas(pid) {
    const rest = (a.tasks || []).filter((t) => t !== pid && TASKS[t]).slice(0, 2);
    return rest.length ? ideaList(rest, 'Ձեր մյուս ընտրած գործերի համար') : '';
  }
  function ideaList(ids, head) {
    return sec(head, ids.map((t) => `<div class="result__idea">
        <p class="result__head">${esc(TASKS[t].short)}</p>
        <p class="result__text">${esc(TASKS[t].idea)}</p>
        <button type="button" class="result__more" data-explore="${t}">Ուզում եմ սա էլ ուսումնասիրել →</button>
      </div>`).join(''));
  }

  /* ---------- 06 · After: the optional questions, the record, sending ---------- */
  function afterHtml() {
    const r = (name, value, label, key) => choiceRow(name, 'radio', value, label, a[key] === value, true);
    const wantsCourse = a.k1 === 'yes' || a.k1 === 'maybe';
    const contact = a.k3 === 'email' || a.k3 === 'sms';
    let html = `<div class="result__rule"></div>`;
    html += `<div class="result__sec"><h2 class="result__head">Այս առաջարկը որքանո՞վ է համապատասխանում ձեր խնդրին</h2>
      <div class="choices" data-after="fit">${r('fit', 'full', 'Լիովին', 'fit')}${r('fit', 'partly', 'Մասամբ', 'fit')}${r('fit', 'no', 'Չի համապատասխանում', 'fit')}</div>
      ${textField('fitText', { label: 'Ի՞նչը պետք է փոխենք (ընտրովի)', placeholder: 'Գրեք ձեր կարծիքը', max: 300, multiline: true }, 'survey__group')}</div>`;
    html += `<div class="result__sec"><h2 class="result__head">Կցանկանա՞ք «AI Քեզ Բան» դասընթացում սովորել՝ ինչպես կիրառել այս լուծումը ձեր գործերում</h2>
      <div class="choices" data-after="k1">${r('k1', 'yes', 'Այո, ուզում եմ մանրամասները', 'k1')}${r('k1', 'maybe', 'Հնարավոր է, եթե ծրագիրն ու գինը հարմար լինեն', 'k1')}${r('k1', 'self', 'Առայժմ ուզում եմ ինքնուրույն փորձել', 'k1')}${r('k1', 'no', 'Ոչ', 'k1')}</div></div>`;
    if (wantsCourse) {
      html += `<div class="result__sec"><h2 class="result__head">Շաբաթական մոտ որքա՞ն ժամանակ կարող եք հատկացնել սովորելուն</h2>
        <div class="choices" data-after="k2">${r('k2', '1', 'Մինչև 1 ժամ', 'k2')}${r('k2', '1-3', '1–3 ժամ', 'k2')}${r('k2', '3+', 'Ավելի քան 3 ժամ', 'k2')}${r('k2', 'unknown', 'Դեռ չգիտեմ', 'k2')}</div></div>
        <div class="result__sec"><h2 class="result__head">Ի՞նչն է ամենից շատ խանգարում սկսելուն (ընտրովի)</h2>
        <div class="choices" data-after="k2Barrier">${r('k2Barrier', 'time', 'Ժամանակը', 'k2Barrier')}${r('k2Barrier', 'price', 'Գինը', 'k2Barrier')}${r('k2Barrier', 'tech', 'Տեխնիկական դժվարությունը', 'k2Barrier')}${r('k2Barrier', 'unclear', 'Օգուտը դեռ պարզ չէ', 'k2Barrier')}${r('k2Barrier', 'other', 'Այլ', 'k2Barrier')}</div></div>`;
    }
    html += `<div class="result__sec"><h2 class="result__head">Կցանկանա՞ք ձեր առաջարկները ստանալ նաև նամակով կամ հաղորդագրությամբ</h2>
      <div class="choices" data-after="k3">${r('k3', 'no', 'Ոչ, կարդում եմ այստեղ', 'k3')}${r('k3', 'email', 'Էլեկտրոնային փոստով', 'k3')}${r('k3', 'sms', 'SMS-ով', 'k3')}</div>`;
    if (a.k3 === 'email') html += `<label class="field survey__group"><span class="field__label">Էլ. հասցե</span><input class="field__input" data-after-field="email" type="email" autocomplete="email" inputmode="email" value="${esc(a.email || '')}" /></label>`;
    if (a.k3 === 'sms') html += `<label class="field survey__group"><span class="field__label">Հեռախոսահամար</span><input class="field__input" data-after-field="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+374" value="${esc(a.phone || '')}" /></label>`;
    if (contact) html += `<div class="choices survey__group">${choiceRow('marketing', 'checkbox', 'yes', 'Ցանկանում եմ նաև տեղեկություններ ստանալ AI Քեզ Բան դասընթացների մասին՝ իմ ընտրած կապի միջոցով', !!a.marketing)}</div>`;
    html += `</div>`;
    html += `<p class="survey__error" data-after-error hidden></p>
      <div class="result__send"><button type="button" class="btn btn--primary btn--md btn--block" data-send>Ուղարկել</button></div>`;
    return html;
  }

  // The stored record (field names from the survey document). Unknown is 'unknown', never false or 0.
  function record() {
    const u = (v) => (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) ? 'unknown' : v);
    const pid = primaryId();
    const known = TASKS[pid];
    const pick = known ? choose(known) : null;
    return {
      survey_version: SURVEY_VERSION, rules_version: RULES_VERSION, respondent_id: respondentId,
      source: new URLSearchParams(location.search).get('src') || 'unknown',   // the share channel: ?src=facebook|email|messenger|sms
      roles: u(a.role), role_other: u(a.roleOther), occupation: u(a.occupation),
      task_ids: u(a.taskSolo ? [a.taskSolo] : a.tasks), task_other: u(a.taskOther), primary_task_id: u(pid), primary_task_text: u(a.unsureText || a.notyetText),
      goal: u(a.goal), goal_other: u(a.goalOther), example: u(a.example),
      baseline_period: '7d', baseline_count: u(a.count), baseline_count_exact: u(a.countExact),
      baseline_minutes: a.timeUnknown || a.count === '0' || pid === 'new' ? 'unknown' : u(a.hours || a.minutes ? Number(a.hours || 0) * 60 + Number(a.minutes || 0) : ''),
      rare: u(a.rare), rare_time: u(a.rareTime),
      bottleneck_ids: u(a.bottlenecks), bottleneck_other: u(a.bottleneckOther), apps: u(a.apps), apps_other: u(a.appsOther), app_name: u(a.appName), input_types: u(a.inputs),
      ai_level: u(a.level), ai_tools: u(a.tools), device: u(a.device), budget_preference: u(a.budget), budget_amount: u(a.budgetAmount),
      interface_languages: u(a.langs), constraints: u(a.constraints), constraint_other: u(a.constraintOther),
      automation_answers: { a1: u(a.a1), a1_text: u(a.a1Text), a2: u(a.a2) },
      income_answers: { path: u(a.incomePath), obstacle: u(a.incomeObstacle), obstacle_other: u(a.incomeObstacleOther) },
      recommendation_ids: pid ? [`${pid}:${pick ? pick.id : 'custom'}${known && automationOk(pid) ? '+automation-candidate' : ''}`] : ['general'],
      explored: u(a.explored),
      feedback: { fit: u(a.fit), text: u(a.fitText) }, course: { interest: u(a.k1), hours: u(a.k2), barrier: u(a.k2Barrier) },
    };
  }
  // Resolves true once stored; never throws (a failed post must not break the page)
  function post(kind, payload) {
    if (!SURVEY_ENDPOINT) return Promise.resolve(false);
    return fetch(SURVEY_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, ...payload }), keepalive: true })
      .then((res) => res.ok).catch(() => false);
  }

  function showResult(fresh) {
    current = null;
    screens.result.innerHTML = recommendation() + afterHtml();
    show('result');
    if (fresh) { window.scrollTo(0, 0); screens.result.querySelector('.survey__title').focus({ preventScroll: true }); post('response', { response: record() }); }
    try { window.history.pushState({ s: 'result' }, ''); } catch (e) { /* optional */ }
    a.done = true; save();
  }
  function redrawAfter() {
    const y = window.scrollY;
    const old = screens.result.querySelector('.result__rule');
    while (old.nextSibling) old.nextSibling.remove();
    const tmp = document.createElement('div'); tmp.innerHTML = afterHtml();
    tmp.firstElementChild.remove();
    old.after(...tmp.childNodes);
    window.scrollTo(0, y);
  }

  screens.result.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-after] input')) { a[t.name] = t.value; if (t.name === 'k1' && !(t.value === 'yes' || t.value === 'maybe')) { a.k2 = null; a.k2Barrier = null; } save(); redrawAfter(); }
    else if (t.name === 'marketing') { a.marketing = t.checked; save(); }
  });
  screens.result.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.field) { a[t.dataset.field] = t.value; save(); }
    if (t.dataset.afterField) { a[t.dataset.afterField] = t.value; save(); }
  });
  screens.result.addEventListener('click', async (e) => {
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      const text = screens.result.querySelector('[data-prompt]').innerText;
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch (err) { /* older phones: the textarea way below */ }
      if (!ok) {
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;opacity:0';   /* off view for the moment it exists */
        document.body.append(ta); ta.select();
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        ta.remove();
      }
      copy.textContent = ok ? 'Պատճենված է ✓' : 'Պատճենել չհաջողվեց․ նշեք տեքստը և պատճենեք';
      setTimeout(() => { copy.textContent = 'Պատճենել հարցումը'; }, 2500);
    }
    const explore = e.target.closest('[data-explore]');
    if (explore) {
      // the same detailed questions for another task: it becomes the primary one, the task-specific answers start over
      const t = explore.dataset.explore;
      a.explored = [...(a.explored || []), t];
      if (!has(a.tasks, t)) { a.tasks = [t]; a.taskSolo = null; }
      a.primary = t;
      for (const k of ['goal', 'goalOther', 'incomePath', 'incomeObstacle', 'incomeObstacleOther', 'example', 'count', 'countExact', 'hours', 'minutes', 'timeUnknown', 'rare', 'rareTime',
        'bottlenecks', 'bottleneckOther', 'apps', 'appsOther', 'appName', 'inputs', 'a1', 'a1Text', 'a2']) delete a[k];
      a.done = false;
      history = steps().slice(0, steps().indexOf('q4'));
      go('q4');
    }
    if (e.target.closest('[data-send]')) {
      const err = screens.result.querySelector('[data-after-error]');
      let msg = '';
      if (a.k3 === 'email' && !/^\S+@\S+\.\S+$/.test(a.email || '')) msg = 'Ստուգեք էլ. հասցեն։';
      if (a.k3 === 'sms' && (a.phone || '').replace(/\D/g, '').length < 8) msg = 'Ստուգեք հեռախոսահամարը։';
      err.textContent = msg; err.hidden = !msg;
      if (msg) return;
      const send = e.target.closest('[data-send]');
      send.disabled = true;
      const { feedback, course } = record();
      if (!a.feedbackSent) post('feedback', { respondent_id: respondentId, feedback, course }).then((ok) => { if (ok) { a.feedbackSent = true; save(); } });
      if (a.k3 === 'email' || a.k3 === 'sms') {
        // kept apart from the answers, with the same respondent_id; asking for a copy is not marketing consent
        const ok = await post('contact', { respondent_id: respondentId, channel: a.k3, email: a.k3 === 'email' ? a.email : undefined, phone: a.k3 === 'sms' ? a.phone : undefined, marketing_consent: !!a.marketing });
        if (!ok) {
          // the person is waiting for a copy: say it didn't go, never thank them for nothing
          err.textContent = 'Չհաջողվեց ուղարկել։ Ստուգեք ինտերնետը և փորձեք նորից։'; err.hidden = false;
          send.disabled = false;
          return;
        }
      }
      const rule = screens.result.querySelector('.result__rule');
      while (rule.nextSibling) rule.nextSibling.remove();
      rule.insertAdjacentHTML('afterend', `<p class="result__done">Շնորհակալություն։ ${a.k3 === 'email' ? 'Առաջարկները կուղարկենք ձեր էլ. հասցեին։' : a.k3 === 'sms' ? 'Առաջարկները կուղարկենք SMS-ով։' : 'Ձեր առաջարկները մնում են այս էջում։'}</p>`);
      a.sent = true; save();
    }
  });

  /* ---------- 07 · Start ---------- */
  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ a, history, order, respondentId, current })); } catch (e) { /* storage is optional */ }
  }
  function load() {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; }
  }
  const shuffle = (list) => { const l = [...list]; for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

  const saved = load();
  if (saved) ({ a, history, order, respondentId } = { ...saved, a: saved.a || {}, history: saved.history || [] });
  if (!order || order.length !== TASK_IDS.length) order = shuffle(TASK_IDS);   // Հ2's order varies between respondents, never for one
  if (!respondentId) respondentId = newId();

  root.querySelector('[data-start]').addEventListener('click', () => { history = []; go('q1'); });
  window.addEventListener('popstate', () => {
    // the phone's back button walks the survey back instead of leaving the page
    if (!screens.result.hidden) { const last = history.pop(); if (last) { a.done = false; save(); return render(last); } return showIntro(); }
    if (current) back();
  });

  if (saved?.a?.done) showResult(false);
  else if (saved?.current && Q[saved.current]) render(saved.current);
  else showIntro();
})();
