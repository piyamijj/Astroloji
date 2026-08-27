/**
 * Vedik Astroloji Yorum Sözlüğü (Statik Veri Tabanı)
 *
 * Bu dosya, components/Interpretation.tsx tarafından kullanılan hazır
 * (offline, ücretsiz, anında) Türkçe yorum metinlerini içerir. Yapay zeka
 * gerektirmez; hesaplanan burç/ev numaralarına göre sözlükten doğrudan
 * metin seçilip birleştirilir.
 *
 * TASARIM NOTU: Ay burcu x Ay evi ve Güneş burcu x Mars burcu için 12x12'lik
 * (144 adet) tamamen ayrı metin yazmak yerine, BİLEŞİMSEL (compositional)
 * bir yaklaşım kullanılır: her eksen için 12'şer temel metin yazılır
 * (ör. "Ay burcu Koç" metni + "4. evdeki Ay" metni) ve bu iki metin
 * birleştirilerek okunaklı, kişiye özel hissettiren tek bir paragraf elde
 * edilir. Bu, hem bakımı kolay hem de anlamlı sayıda benzersiz kombinasyon
 * (12 x 12 = 144 farklı okuma) üreten kanıtlanmış bir yöntemdir.
 */

import { ZODIAC_SIGNS_TR } from "@/lib/astro-constants";

function safeSignIndex(sign: number): number {
  return ((sign - 1) % 12 + 12) % 12;
}

/** Yükselen (Ascendant) burcuna göre genel karakter, dış görünüş ve hayata yaklaşım. */
const ASCENDANT_TEXTS: string[] = [
  // Koç
  "Koç yükselen, hayata atılgan ve girişken bir tavırla yaklaşır. Enerjik, hızlı hareket eden, rekabeti seven bir dış izlenim bırakırsınız; ilk bakışta kararlı ve cesur görünürsünüz. Hayatınıza öncülük etme, yeni işlere ilk adımı atma güdüsü baskındır; sabırsızlık ve tez canlılık en büyük sınavınızdır.",
  // Boğa
  "Boğa yükselen, sakin, istikrarlı ve güven veren bir duruş sergiler. Dış görünüşünüzde huzurlu, dayanıklı ve zevk sahibi bir hava vardır; maddi güvenliğe ve konfora doğal bir eğilim taşırsınız. Hayata yaklaşımınız temkinli ve kalıcıdır; değişime karşı direnç gösterme eğiliminizi fark etmek gelişiminize katkı sağlar.",
  "İkizler yükselen, meraklı, konuşkan ve zihinsel olarak son derece hareketlidir. Dış dünyaya karşı esprili, uyumlu ve iletişim odaklı bir yüz gösterirsiniz; birden fazla ilgi alanını aynı anda sürdürme kapasitesine sahipsiniz. Hayata hafif ve esnek yaklaşırsınız; odaklanma ve derinleşme üzerinde çalışmak size fayda sağlar.",
  // Yengeç
  "Yengeç yükselen, koruyucu, duyarlı ve sıcak bir ilk izlenim bırakır. Dış görünüşünüzde nazik ama temkinli bir hava vardır; güven oluşana kadar kabuğunuza çekilirsiniz. Hayata duygusal bir mercekten bakarsınız; aile ve ev, kimliğinizin merkezinde yer alır ve güvenlik ihtiyacınız kararlarınızı şekillendirir.",
  // Aslan
  "Aslan yükselen, karizmatik, sıcak ve kendinden emin bir duruşa sahiptir. Dış dünyaya asil, cömert ve dikkat çeken bir imaj sunarsınız; doğal bir liderlik havası taşırsınız. Hayata yaratıcı ve gösterişli bir tavırla yaklaşırsınız; takdir edilme ihtiyacınızı fark edip dengelemek olgunluğunuzu artırır.",
  // Başak
  "Başak yükselen, titiz, analitik ve mütevazı bir ilk izlenim yaratır. Dış görünüşünüzde düzenli, temiz ve hizmet odaklı bir hava vardır; ayrıntılara gösterdiğiniz özen dikkat çeker. Hayata pratik ve eleştirel bir gözle yaklaşırsınız; kendinize karşı fazla eleştirel olma eğiliminizi yumuşatmak size huzur getirir.",
  // Terazi
  "Terazi yükselen, zarif, diplomatik ve uyum arayan bir hava taşır. Dış dünyaya hoş, dengeli ve estetik bir izlenim bırakırsınız; ilişkiler ve adalet duygusu hayat felsefenizin merkezindedir. Hayata işbirliği ve uzlaşma yoluyla yaklaşırsınız; kararsızlığınızı aşmak en önemli kişisel gelişim alanınızdır.",
  // Akrep
  "Akrep yükselen, yoğun, gizemli ve derin bir ilk izlenim bırakır. Dış görünüşünüzde manyetik ve keskin bakışlı bir hava vardır; kolay kolay güven vermez, ama bir kez güvendiğinizde sarsılmaz bağlar kurarsınız. Hayata dönüştürücü ve araştırmacı bir tavırla yaklaşırsınız; kontrolü bırakmayı öğrenmek size özgürlük kazandırır.",
  // Yay
  "Yay yükselen, iyimser, maceracı ve açık sözlü bir hava taşır. Dış dünyaya enerjik, felsefi ve özgür ruhlu bir izlenim bırakırsınız; ufkunuzu genişletme arzusu hayatınızın itici gücüdür. Hayata iyimser ve keşfe açık yaklaşırsınız; ayrıntılara ve sorumluluklara daha fazla sabır göstermek dengenizi güçlendirir.",
  // Oğlak
  "Oğlak yükselen, ciddi, disiplinli ve olgun bir ilk izlenim yaratır. Dış görünüşünüzde ağırbaşlı, güvenilir ve hırslı bir hava vardır; sorumluluk almaktan çekinmezsiniz. Hayata uzun vadeli hedefler ve azimle yaklaşırsınız; kendinize karşı katılığınızı yumuşatmak yaşam kaliteni­zi yükseltir.",
  // Kova
  "Kova yükselen, özgün, bağımsız ve entelektüel bir hava taşır. Dış dünyaya sıra dışı, arkadaş canlısı ve ileri görüşlü bir izlenim bırakırsınız; toplumsal meselelere doğal bir ilginiz vardır. Hayata yenilikçi ve mesafeli bir tavırla yaklaşırsınız; duygusal yakınlık kurmaya zaman ayırmak sizi tamamlar.",
  // Balık
  "Balık yükselen, hassas, hayalperest ve şefkatli bir ilk izlenim bırakır. Dış görünüşünüzde yumuşak, sanatsal ve biraz ulaşılmaz bir hava vardır; empati yeteneğiniz güçlüdür. Hayata sezgisel ve akışkan bir tavırla yaklaşırsınız; net sınırlar koymayı öğrenmek sizi hayattaki dalgalanmalara karşı korur.",
];

/** Ay burcuna göre temel zihinsel yapı ve duygusal tepki tarzı. */
const MOON_SIGN_TEXTS: string[] = [
  "Ay'ınız Koç burcunda olduğu için duygusal tepkileriniz hızlı, dürüst ve andan ana yaşanır; içsel dünyanız hareket ve bağımsızlık ister, öfkeniz çabuk gelip çabuk geçer.",
  "Ay'ınız Boğa burcunda olduğu için duygusal dünyanız istikrar, konfor ve fiziksel güvenlik arar; zihniniz yavaş ama derin işler, duygusal değişimlere karşı direnç gösterirsiniz.",
  "Ay'ınız İkizler burcunda olduğu için zihniniz sürekli meraklı ve konuşkandır; duygularınızı düşünerek işlersiniz, iç dünyanızda çeşitlilik ve zihinsel uyarım ihtiyacı baskındır.",
  "Ay'ınız Yengeç burcunda olduğu için duygusal hassasiyetiniz çok yüksektir; iç dünyanız aile, geçmiş ve ev merkezlidir, kendinizi güvende hissetmek zihinsel huzurunuzun temelidir.",
  "Ay'ınız Aslan burcunda olduğu için duygusal ihtiyaçlarınız görülmek ve takdir edilmek üzerine kuruludur; iç dünyanız sıcak, cömert ve dramatik bir şekilde ifade bulur.",
  "Ay'ınız Başak burcunda olduğu için zihniniz analitik ve düzenlidir; duygularınızı pratik hizmet ve fayda üzerinden işlersiniz, iç huzurunuz düzen ve kontrol duygusuna bağlıdır.",
  "Ay'ınız Terazi burcunda olduğu için duygusal dengeniz ilişkiler ve uyum üzerinden şekillenir; iç dünyanız çatışmadan kaçınır, adalet ve estetik zihinsel huzurunuzu besler.",
  "Ay'ınız Akrep burcunda olduğu için duygularınız yoğun, derin ve gizli akar; iç dünyanız güven meselesine çok duyarlıdır, yaşadığınız duygusal dönüşümler sizi güçlendirir.",
  "Ay'ınız Yay burcunda olduğu için duygusal ihtiyaçlarınız özgürlük ve anlam arayışı etrafında şekillenir; iç dünyanız iyimser, felsefi ve keşfe açıktır.",
  "Ay'ınız Oğlak burcunda olduğu için duygularınızı kontrollü ve olgun bir şekilde ifade edersiniz; iç dünyanız sorumluluk ve başarı ihtiyacıyla şekillenir, hassasiyetinizi göstermekte zorlanabilirsiniz.",
  "Ay'ınız Kova burcunda olduğu için duygusal dünyanız mesafeli ve mantık süzgecinden geçmiş görünür; iç huzurunuz özgürlük, özgünlük ve toplumsal aidiyet ihtiyacına bağlıdır.",
  "Ay'ınız Balık burcunda olduğu için duygularınız son derece geçirgen ve sezgiseldir; iç dünyanız hayal gücü, şefkat ve empati ile doludur, sınır koymayı öğrenmek duygusal dengenizi korur.",
];

/** Ay'ın bulunduğu eve göre bu duygusal yapının hayatta hangi alanda öne çıktığı. */
const MOON_HOUSE_TEXTS: string[] = [
  "1. evdeki Ay, bu duygusal doğayı kimliğinizin ve dış görünüşünüzün doğrudan bir parçası hâline getirir; ne hissettiğiniz genellikle yüzünüze yansır.",
  "2. evdeki Ay, duygusal güvenliğinizi maddi birikim, aile değerleri ve kişisel kaynaklarla ilişkilendirir; finansal istikrar iç huzurunuzu doğrudan etkiler.",
  "3. evdeki Ay, duygularınızı iletişim, kardeşler ve yakın çevre üzerinden işlersiniz; konuşmak ve paylaşmak sizin için duygusal bir rahatlama yoludur.",
  "4. evdeki Ay, en güçlü konumlarından birindedir; ev, aile ve kök duyguları hayatınızın merkezine oturur, duygusal ihtiyaçlarınız çok belirgindir.",
  "5. evdeki Ay, duygularınızı yaratıcılık, aşk ve çocuklar üzerinden ifade edersiniz; kendinizi özgürce ifade edebildiğiniz ortamlarda duygusal olarak beslenirsiniz.",
  "6. evdeki Ay, günlük rutinler, iş ve sağlık üzerinden duygusal tatmin ararsınız; hizmet etmek ve düzenli olmak size huzur verir, aşırı endişeye eğiliminiz olabilir.",
  "7. evdeki Ay, duygusal ihtiyaçlarınızı ilişkiler ve ortaklıklar üzerinden karşılarsınız; başkalarıyla kurduğunuz bağ, ruh hâlinizi doğrudan etkiler.",
  "8. evdeki Ay, derin, dönüştürücü ve gizli duygusal yaşantılara işaret eder; paylaşılan kaynaklar ve yakın ilişkilerdeki güven meseleleri sizi çok etkiler.",
  "9. evdeki Ay, duygusal tatmini öğrenme, seyahat ve inanç sistemleri üzerinden bulursunuz; ufkunuzu genişleten deneyimler size huzur verir.",
  "10. evdeki Ay, kariyeriniz ve toplumsal itibarınız duygusal ihtiyaçlarınızla iç içe geçmiştir; işinizde görülmek ve değer görmek sizin için önemlidir.",
  "11. evdeki Ay, arkadaşlıklar, topluluklar ve ortak hedefler üzerinden duygusal tatmin bulursunuz; ait olma duygusu iç huzurunuzun anahtarıdır.",
  "12. evdeki Ay, iç dünyanız oldukça derin, gizli ve içe dönüktür; yalnız kalma ihtiyacı, sezgisel yaşam ve manevi arayış duygusal dengeniz için önemlidir.",
];

/** Güneş burcuna göre kariyer, maddiyat ve genel yaşam amacı eğilimi. */
const SUN_SIGN_CAREER_TEXTS: string[] = [
  "Güneş'iniz Koç burcunda olduğu için kariyerinizde öncü, girişimci ve rekabetçi roller sizi tatmin eder; kendi işinizin patronu olmak veya liderlik pozisyonları maddi motivasyonunuzu yükseltir.",
  "Güneş'iniz Boğa burcunda olduğu için maddi güvenlik ve istikrar kariyer hedeflerinizin merkezindedir; finans, sanat, gayrimenkul veya lüks sektörlerinde sabırlı çalışarak kalıcı birikim yaparsınız.",
  "Güneş'iniz İkizler burcunda olduğu için iletişim, yazı, satış veya eğitim gibi zihinsel çeşitlilik sunan işlerde başarılı olursunuz; birden fazla gelir kapısı açmak size hem güven hem tatmin verir.",
  "Güneş'iniz Yengeç burcunda olduğu için kariyerinizde bakım, gıda, emlak veya aile işletmeciliği gibi besleyici ve güven veren alanlar öne çıkar; maddi güvenliği aile huzuruyla ilişkilendirirsiniz.",
  "Güneş'iniz Aslan burcunda olduğu için liderlik, sanat, eğlence veya yönetim pozisyonlarında parlarsınız; görünür olmak ve takdir edilmek kariyer motivasyonunuzun temel kaynağıdır.",
  "Güneş'iniz Başak burcunda olduğu için sağlık, analiz, hizmet veya düzen gerektiren mesleklerde başarılı olursunuz; titiz çalışmanız maddi kazancınızı zamanla istikrarlı şekilde artırır.",
  "Güneş'iniz Terazi burcunda olduğu için hukuk, danışmanlık, tasarım veya ortaklık temelli işlerde başarılı olursunuz; adil ve dengeli iş ilişkileri maddi tatmininizin anahtarıdır.",
  "Güneş'iniz Akrep burcunda olduğu için araştırma, finans, psikoloji veya kriz yönetimi gibi derinlik gerektiren alanlarda güçlenirsiniz; kaynakları dönüştürme yeteneğiniz maddi güç kazandırır.",
  "Güneş'iniz Yay burcunda olduğu için eğitim, hukuk, seyahat veya yayıncılık gibi ufuk genişleten alanlarda başarılı olursunuz; büyük vizyonlar peşinde koşmak maddi fırsatları da beraberinde getirir.",
  "Güneş'iniz Oğlak burcunda olduğu için kariyer hırsınız güçlüdür; disiplin, sabır ve uzun vadeli planlama sayesinde zamanla otorite ve maddi güvenceye ulaşırsınız.",
  "Güneş'iniz Kova burcunda olduğu için teknoloji, bilim, sosyal girişimcilik veya toplumsal projelerde öne çıkarsınız; yenilikçi fikirleriniz hem itibar hem maddi kazanç sağlayabilir.",
  "Güneş'iniz Balık burcunda olduğu için sanat, sağlık, ruhsal danışmanlık veya hayır işleri gibi şefkat gerektiren alanlarda tatmin bulursunuz; maddi kazancınız çoğu zaman sezgisel kararlarla şekillenir.",
];

/** Mars burcuna göre mücadele gücü, motivasyon tarzı ve enerjinin dışa vurumu. */
const MARS_SIGN_DRIVE_TEXTS: string[] = [
  "Mars'ınız Koç burcunda olduğu için mücadele gücünüz doğrudan, hızlı ve cesurdur; harekete geçmekte tereddüt etmez, rekabette güçlü bir dürtüyle öne çıkarsınız.",
  "Mars'ınız Boğa burcunda olduğu için mücadeleniz yavaş ama sarsılmazdır; bir kez harekete geçtiğinizde kolay kolay vazgeçmez, sabırla hedefe ulaşırsınız.",
  "Mars'ınız İkizler burcunda olduğu için enerjinizi sözcükler ve fikirler üzerinden dışa vurursunuz; mücadeleniz zihinsel çeviklik ve ikna gücüne dayanır.",
  "Mars'ınız Yengeç burcunda olduğu için mücadeleniz dolaylı ama korumacıdır; sevdiklerinizi ve güvenliğinizi tehdit eden durumlarda sert bir savunma içgüdüsü devreye girer.",
  "Mars'ınız Aslan burcunda olduğu için mücadele gücünüz gururlu ve gösterişlidir; kendinizi kanıtlama ihtiyacı sizi cesur ve yaratıcı adımlar atmaya iter.",
  "Mars'ınız Başak burcunda olduğu için enerjinizi titiz planlama ve ayrıntılara dikkatle yönlendirirsiniz; mücadeleniz sabırlı, yöntemli ve verimlilik odaklıdır.",
  "Mars'ınız Terazi burcunda olduğu için doğrudan çatışmadan kaçınır, mücadelenizi diplomasi ve stratejik ittifaklarla yürütürsünüz; adaletsizlik karşısında harekete geçme gücünüz yüksektir.",
  "Mars'ınız Akrep burcunda olduğu için mücadele gücünüz son derece yoğun, kararlı ve stratejiktir; bir hedefe odaklandığınızda geri adım atmazsınız.",
  "Mars'ınız Yay burcunda olduğu için enerjinizi maceraperest ve iyimser bir şekilde kullanırsınız; mücadeleniz büyük hedefler ve özgürlük arayışıyla beslenir.",
  "Mars'ınız Oğlak burcunda olduğu için mücadele gücünüz disiplinli, hesaplı ve sabırlıdır; uzun vadeli hedeflere ulaşmak için sistemli şekilde çalışırsınız.",
  "Mars'ınız Kova burcunda olduğu için enerjinizi özgün fikirler ve toplumsal davalar için kullanırsınız; mücadeleniz bağımsız, öngörülemez ve ilkeli bir tarzda ilerler.",
  "Mars'ınız Balık burcunda olduğu için mücadele gücünüz dolaylı ve sezgiseldir; doğrudan çatışmak yerine sabır, kaçınma veya ilham verici bir tavırla direnç gösterirsiniz.",
];

export function getAscendantInterpretation(sign: number): string {
  return ASCENDANT_TEXTS[safeSignIndex(sign)];
}

export function getMoonInterpretation(moonSign: number, moonHouse: number): string {
  const signText = MOON_SIGN_TEXTS[safeSignIndex(moonSign)];
  const houseIdx = ((moonHouse - 1) % 12 + 12) % 12;
  const houseText = MOON_HOUSE_TEXTS[houseIdx];
  return `${signText} ${houseText}`;
}

export function getCareerAndDriveInterpretation(
  sunSign: number,
  marsSign: number
): string {
  const sunText = SUN_SIGN_CAREER_TEXTS[safeSignIndex(sunSign)];
  const marsText = MARS_SIGN_DRIVE_TEXTS[safeSignIndex(marsSign)];
  return `${sunText} ${marsText}`;
}

/** Geliştirme/hata ayıklama amaçlı: tüm burç adlarının sözlükle eşleştiğini doğrular. */
export function assertDictionaryIntegrity(): boolean {
  return (
    ASCENDANT_TEXTS.length === ZODIAC_SIGNS_TR.length &&
    MOON_SIGN_TEXTS.length === ZODIAC_SIGNS_TR.length &&
    MOON_HOUSE_TEXTS.length === 12 &&
    SUN_SIGN_CAREER_TEXTS.length === ZODIAC_SIGNS_TR.length &&
    MARS_SIGN_DRIVE_TEXTS.length === ZODIAC_SIGNS_TR.length
  );
}
