fn main() {
    use std::{env, fs, path::PathBuf};
    println!("cargo:rerun-if-env-changed=TAGMA_INTERNAL_PACK_DIR");
    let out = PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR"));
    let bytes = if let Some(dir) = env::var_os("TAGMA_INTERNAL_PACK_DIR") {
        assert_eq!(env::var("PROFILE").as_deref(), Ok("debug"));
        let path = PathBuf::from(dir).join("internal-pack.json");
        println!("cargo:rerun-if-changed={}", path.display());
        let bytes = fs::read(path).expect("internal public catalogue");
        assert!(bytes.len() <= 400_000);
        bytes
    } else {
        b"null".to_vec()
    };
    fs::write(out.join("internal-pack.json"), bytes).expect("public catalogue");
}
