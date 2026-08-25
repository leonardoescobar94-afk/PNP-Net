import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const outdir='.test-build';await rm(outdir,{recursive:true,force:true});await mkdir(outdir);
await build({entryPoints:['tests/analysis.test.ts'],bundle:true,platform:'node',target:'node18',format:'esm',outdir,packages:'external'});
const result=spawnSync(process.execPath,['--test',`${outdir}/analysis.test.js`],{stdio:'inherit'});await rm(outdir,{recursive:true,force:true});process.exit(result.status??1);
