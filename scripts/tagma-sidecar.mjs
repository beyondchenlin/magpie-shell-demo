import { spawnSync } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const release = process.argv.includes('--release') || (!process.argv.includes('--debug') && process.env.TAURI_ENV_DEBUG !== 'true');
const rustc = spawnSync('rustc',['-vV'],{encoding:'utf8',timeout:15_000,windowsHide:true});
if (rustc.status !== 0) throw new Error('Rust toolchain unavailable');
const target = process.env.TAURI_ENV_TARGET_TRIPLE || /^host: (.+)$/m.exec(rustc.stdout)?.[1];
if (!target || !/^[a-z0-9_-]+$/.test(target)) throw new Error('Invalid sidecar target');
const args=['build','-p','tagma-gateway','--locked'];
if (release) args.push('--release');
// Cross targets must be built in their native CI; no accidental host-sidecar packaging.
if (target !== /^host: (.+)$/m.exec(rustc.stdout)?.[1]) throw new Error('Build sidecar on the target platform');
const build=spawnSync('cargo',args,{stdio:'inherit',timeout:600_000,windowsHide:true});
if(build.status!==0) process.exit(build.status || 1);
const extension=target.includes('windows')?'.exe':'';
mkdirSync('src-tauri/binaries',{recursive:true});
copyFileSync(join('target',release?'release':'debug',`tagma-gateway${extension}`),join('src-tauri/binaries',`tagma-gateway-${target}${extension}`));
console.log(`Prepared ${target} sidecar (${release?'release':'debug'}).`);
