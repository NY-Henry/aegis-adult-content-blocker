use std::fs;
use std::io::Write;
use std::path::Path;

const HOSTS_PATH: &str = r"C:\Windows\System32\drivers\etc\hosts";
const BACKUP_PATH: &str = r"C:\Windows\System32\drivers\etc\hosts.aegis.bak";
const BEGIN_MARKER: &str = "# >>> BEGIN AEGIS GUARD BLOCKLIST <<<";
const END_MARKER: &str = "# >>> END AEGIS GUARD BLOCKLIST <<<";

// Top curated high-impact explicit domains built-in for instant zero-latency protection
const BUILTIN_ADULT_DOMAINS: &[&str] = &[
    "pornhub.com", "www.pornhub.com", "rt.pornhub.com", "de.pornhub.com", "fr.pornhub.com",
    "xvideos.com", "www.xvideos.com", "xvideos2.com", "xvideos3.com",
    "xnxx.com", "www.xnxx.com", "xnxx2.com", "xnxx.tv",
    "redtube.com", "www.redtube.com", "es.redtube.com", "de.redtube.com",
    "youporn.com", "www.youporn.com",
    "xhamster.com", "www.xhamster.com", "xhamster1.com", "xhamster2.com", "xhamster3.com", "xhamster.desi",
    "chaturbate.com", "www.chaturbate.com",
    "onlyfans.com", "www.onlyfans.com",
    "stripchat.com", "www.stripchat.com",
    "livejasmin.com", "www.livejasmin.com",
    "cam4.com", "www.cam4.com",
    "camsoda.com", "www.camsoda.com",
    "myfreecams.com", "www.myfreecams.com",
    "bongacams.com", "www.bongacams.com",
    "spankbang.com", "www.spankbang.com",
    "tube8.com", "www.tube8.com",
    "beeg.com", "www.beeg.com",
    "eporner.com", "www.eporner.com",
    "tnaflix.com", "www.tnaflix.com",
    "fuq.com", "www.fuq.com",
    "porn.com", "www.porn.com",
    "rule34.xxx", "www.rule34.xxx",
    "e-hentai.org", "nhentai.net", "www.nhentai.net",
    "gelbooru.com", "danbooru.donmai.us",
    "hqporner.com", "motherless.com",
    "heavy-r.com", "brazzers.com", "realitykings.com",
    "bangbros.com", "mofos.com", "naughtyamerica.com",
    "wicked.com", "twistys.com", "evilangel.com",
    "teamskeet.com", "faketaxi.com", "digitalplayground.com",
    "tubegalore.com", "pornmd.com", "nudevista.com",
    "javlibrary.com", "javhd.com", "dmm.co.jp",
    "fapster.xxx", "fapello.com", "coomer.party", "coomer.su",
    "kemono.party", "kemono.su", "erome.com", "www.erome.com",
    "heavy-r.com", "daftsex.com", "txxx.com", "upornia.com",
    "javhub.net", "jable.tv", "missav.com", "netflav.com",
    "lustery.com", "manyvids.com", "fansly.com", "loyalfans.com"
];

// Strict SafeSearch VIP mappings
const SAFESEARCH_OVERRIDES: &str = r#"
# SafeSearch VIP Redirections
216.239.38.120 forcesafesearch.google.com
216.239.38.120 www.google.com
216.239.38.120 google.com
216.239.38.120 www.google.co.uk
216.239.38.120 www.google.ca
216.239.38.120 www.google.com.au
216.239.38.120 www.google.de
216.239.38.120 www.google.fr

204.79.197.220 strict.bing.com
204.79.197.220 www.bing.com
204.79.197.220 bing.com

52.149.246.39 safe.duckduckgo.com
52.149.246.39 duckduckgo.com
52.149.246.39 www.duckduckgo.com

216.239.38.119 restrictmoderate.youtube.com
216.239.38.119 www.youtube.com
216.239.38.119 youtube.com
216.239.38.119 m.youtube.com
216.239.38.119 youtubei.googleapis.com
"#;

pub struct HostsManager;

impl HostsManager {
    pub fn get_hosts_path() -> &'static Path {
        Path::new(HOSTS_PATH)
    }

    pub fn backup_hosts() -> Result<(), String> {
        let hosts = Self::get_hosts_path();
        let backup = Path::new(BACKUP_PATH);
        if hosts.exists() && !backup.exists() {
            let _ = fs::copy(hosts, backup);
        }
        Ok(())
    }

    pub fn read_clean_hosts() -> Result<String, String> {
        let hosts = Self::get_hosts_path();
        if !hosts.exists() {
            return Ok(String::new());
        }

        let content = fs::read_to_string(hosts)
            .map_err(|e| format!("Failed to read hosts file: {}", e))?;

        if let (Some(start), Some(end)) = (content.find(BEGIN_MARKER), content.find(END_MARKER)) {
            let mut cleaned = content[..start].to_string();
            if let Some(after_end) = content[end..].find('\n') {
                cleaned.push_str(&content[end + after_end + 1..]);
            }
            Ok(cleaned.trim().to_string())
        } else {
            Ok(content.trim().to_string())
        }
    }

    pub fn apply_hosts_blocklist(custom_domains: &[String], downloaded_domains: Option<&[String]>) -> Result<usize, String> {
        Self::backup_hosts()?;
        let base_content = Self::read_clean_hosts()?;

        let mut blocklist_content = String::with_capacity(64 * 1024);
        blocklist_content.push_str("\n\n");
        blocklist_content.push_str(BEGIN_MARKER);
        blocklist_content.push_str("\n# System-wide protection managed by Aegis Guard\n");
        blocklist_content.push_str(SAFESEARCH_OVERRIDES);
        blocklist_content.push_str("\n# Curated Explicit Domain Sinkhole\n");

        let mut total_domains = 0;
        let mut seen = std::collections::HashSet::with_capacity(16 * 1024);

        // 1. Builtin domains
        for domain in BUILTIN_ADULT_DOMAINS {
            let clean = domain.trim().to_lowercase();
            if seen.insert(clean.clone()) {
                blocklist_content.push_str(&format!("0.0.0.0 {}\n", clean));
                total_domains += 1;
            }
        }

        // 2. Custom user domains
        for domain in custom_domains {
            let clean = domain.trim().to_lowercase();
            if !clean.is_empty() && seen.insert(clean.clone()) {
                blocklist_content.push_str(&format!("0.0.0.0 {}\n", clean));
                if !clean.starts_with("www.") {
                    let www_variant = format!("www.{}", clean);
                    if seen.insert(www_variant.clone()) {
                        blocklist_content.push_str(&format!("0.0.0.0 {}\n", www_variant));
                        total_domains += 1;
                    }
                }
                total_domains += 1;
            }
        }

        // 3. Downloaded extended domains (capped at 15,000 for optimal Windows DNS performance)
        if let Some(extra) = downloaded_domains {
            for domain in extra.iter().take(15000) {
                let clean = domain.trim().to_lowercase();
                if !clean.is_empty() && seen.insert(clean.clone()) {
                    blocklist_content.push_str(&format!("0.0.0.0 {}\n", clean));
                    total_domains += 1;
                }
            }
        }

        blocklist_content.push_str(END_MARKER);
        blocklist_content.push('\n');

        let final_content = format!("{}{}", base_content, blocklist_content);

        let hosts = Self::get_hosts_path();
        let mut file = fs::OpenOptions::new()
            .write(true)
            .truncate(true)
            .create(true)
            .open(hosts)
            .map_err(|e| format!("Failed to open hosts file (run as Admin): {}", e))?;

        file.write_all(final_content.as_bytes())
            .map_err(|e| format!("Failed to write hosts file: {}", e))?;

        Ok(total_domains)
    }

    pub fn remove_hosts_blocklist() -> Result<(), String> {
        let base_content = Self::read_clean_hosts()?;
        let hosts = Self::get_hosts_path();
        if hosts.exists() {
            fs::write(hosts, format!("{}\n", base_content))
                .map_err(|e| format!("Failed to clean hosts file: {}", e))?;
        }
        Ok(())
    }

    pub async fn fetch_stevenblack_adult_blocklist() -> Result<Vec<String>, String> {
        // Redundant high-speed CDN mirrors with proper User-Agent
        let mirrors = [
            "https://cdn.jsdelivr.net/gh/StevenBlack/hosts@master/alternates/porn/hosts",
            "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn/hosts",
            "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
        ];

        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .timeout(std::time::Duration::from_secs(12))
            .build()
            .map_err(|e| e.to_string())?;

        let mut body = None;

        for url in mirrors {
            if let Ok(resp) = client.get(url).send().await {
                if resp.status().is_success() {
                    if let Ok(text) = resp.text().await {
                        if text.contains("0.0.0.0") {
                            body = Some(text);
                            break;
                        }
                    }
                }
            }
        }

        let body = match body {
            Some(b) => b,
            None => {
                // If offline or blocked, fallback to comprehensive curated offline list
                return Ok(BUILTIN_ADULT_DOMAINS.iter().map(|s| s.to_string()).collect());
            }
        };

        // Parse asynchronously in blocking thread to keep UI completely buttery smooth
        let domains = tokio::task::spawn_blocking(move || {
            let mut list = Vec::with_capacity(16 * 1024);
            for line in body.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("0.0.0.0 ") {
                    let mut parts = trimmed.split_whitespace();
                    parts.next(); // skip 0.0.0.0
                    if let Some(d) = parts.next() {
                        let d_lower = d.to_lowercase();
                        if d_lower != "0.0.0.0" && d_lower != "localhost" && d_lower != "broadcasthost" {
                            list.push(d_lower);
                        }
                    }
                }
            }
            list
        })
        .await
        .map_err(|e| format!("Parsing error: {}", e))?;

        Ok(domains)
    }
}
