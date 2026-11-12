// 本 fork 的公告：原版公告与重要说明已清空，只保留一条来源与侵权联系方式。
export function renderAnnouncementImportant(language: "zh" | "en"): string {
  if (language === "en") {
    return `<section class="announcement-cloud-poster" style="padding:16px 10px;border:2px solid #595959;background:#ededeb;color:#343532">
      <strong style="display:block;font-size:clamp(22px,4vw,32px);line-height:1.3">Modified from the original plugin</strong>
      <p style="font-size:13px;margin:8px 0 0">This plugin is a modified build of <b>Full Suite</b> (FullPeople/obr-suite, by FullPeople) for personal use.<br>Thanks to the original author. For infringement removal, contact <a href="mailto:1538519473@qq.com">1538519473@qq.com</a>.</p>
    </section>`;
  }
  return `<section class="announcement-cloud-poster" style="padding:16px 10px;border:2px solid #595959;background:#ededeb;color:#343532">
    <strong style="display:block;font-size:clamp(22px,4vw,32px);line-height:1.3">基于原插件修改</strong>
    <p style="font-size:13px;margin:8px 0 0">本插件基于原版 <b>Full Suite</b>（FullPeople/obr-suite，作者 FullPeople）修改，仅供个人使用。<br>感谢原作者的辛勤付出。如有侵权，请联系 <a href="mailto:1538519473@qq.com">1538519473@qq.com</a> 删除。</p>
  </section>`;
}
