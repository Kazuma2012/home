import express from "express";
import puppeteer from "puppeteer";
import { JSDOM } from "jsdom";

const app = express();

// Puppeteerブラウザプール
let browser;
(async()=>{ 
  browser = await puppeteer.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox'] }); 
})();

// キャッシュ（静的リソース用）
const cache = new Map();

// タブプール
const pagePool = [];

async function getPage(){
  let page = pagePool.find(p=>!p.busy);
  if(page){ page.busy=true; return page; }
  page = await browser.newPage();
  page.busy=true;
  pagePool.push(page);
  return page;
}

app.get("/proxy", async (req,res)=>{
  const targetUrl = req.query.url;
  if(!targetUrl) return res.send("URLを指定してね");

  try{
    // 1分以内キャッシュなら返す
    if(cache.has(targetUrl)){
      const { html, timestamp } = cache.get(targetUrl);
      if(Date.now()-timestamp<60000) return res.send(html);
    }

    const page = await getPage();
    await page.goto(targetUrl,{ waitUntil:"networkidle2" });
    let content = await page.content();
    page.busy=false;

    const dom = new JSDOM(content);
    const document = dom.window.document;
    const baseUrl = new URL(targetUrl);

    // aタグ書き換え
    document.querySelectorAll("a[href]").forEach(a=>{
      const href = a.getAttribute("href");
      if(!href) return;
      const absolute = new URL(href, baseUrl).href;
      a.setAttribute("href","javascript:void(0)");
      a.setAttribute("onclick",`parent.loadBobURL('${absolute}')`);
    });

    // 画像・スクリプト・CSS書き換え
    ["img","script","link"].forEach(tag=>{
      const attr = tag==="link"?"href":"src";
      document.querySelectorAll(`${tag}[${attr}]`).forEach(el=>{
        const val = el.getAttribute(attr);
        if(!val) return;
        const absolute = new URL(val, baseUrl).href;
        el.setAttribute(attr,"/proxy?url="+encodeURIComponent(absolute));
      });
    });

    // CSS内url()書き換え
    document.querySelectorAll("style,link[rel='stylesheet']").forEach(s=>{
      if(s.href) s.href="/proxy?url="+encodeURIComponent(s.href);
      if(s.textContent) s.textContent=s.textContent.replace(/url\\(["']?(http[^"')]+)["']?\\)/g,(m,u)=>`url(/proxy?url=${encodeURIComponent(u)})`);
    });

    const finalHtml = dom.serialize();
    cache.set(targetUrl,{ html:finalHtml, timestamp:Date.now() });

    res.set("content-type","text/html");
    res.send(finalHtml);

  }catch(err){
    res.status(500).send("エラー: "+err.message);
  }
});

app.listen(process.env.PORT || 3000,()=>console.log("完全高速MultiTabProxy running"));
