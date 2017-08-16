#!/usr/bin/env node

const ora = require("ora");
const { spawn, exec } = require("child-process-promise");
const debug = require("debug")("docker-machine-deploy");
const { promisify } = require("util");
const path = require("path");
const fs = require("fs");
const readFileAsync = promisify(fs.readFile);

async function parseConfig() {
  const json = await readFileAsync(path.resolve(process.cwd(), ".docker-machine-deploy.json"), "utf8");
  return JSON.parse(json);
}

async function parseDockerEnv({ machine }) {
  const { stdout } = await exec(`docker-machine env --shell bash ${machine}`);
  const re = /export (\w+)="(.+?)"/gm;

  const env = {};
  for (let match; (match = re.exec(stdout)); ) {
    const [, name, value] = match;
    env[name] = value;
  }

  return env;
}
const maxBuffer = 1024 * 1024 * 10; // 10mb
(async function() {
  const spinner = ora();
  try {
    spinner.start("Parsing config file...");
    const config = await parseConfig();
    spinner.succeed("Config file read successfully.");
    debug("Found config file %O", config);

    spinner.start(`Reading env variables for [${config.machine}]...`);
    const env = await parseDockerEnv(config);
    env.PATH = env.PATH || "/usr/local/bin:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin";
    spinner.succeed(`Found machine env variables for [${config.machine}].`);
    debug("%O", env);

    spinner.start(`Building...`);
    await exec("docker-compose -f docker-compose.yml build", { maxBuffer });
    spinner.succeed(`Build complete.`);

    spinner.start(`Pushing images...`);
    await exec("docker-compose -f docker-compose.yml push", { maxBuffer });
    spinner.succeed(`Images successfully pushed.`);

    spinner.start(`Pulling images to remote machine...`);
    await exec("docker-compose -f docker-compose.yml pull", { env, maxBuffer });
    spinner.succeed(`Images successfully pulled.`);

    spinner.start(`Deploying new images...`);
    await exec("docker-compose -f docker-compose.yml up -d --remove-orphans", { env, maxBuffer });
    spinner.succeed(`Images successfully updated.`);

    spinner.succeed("Done");
  } catch (error) {
    spinner.fail(error.message);
    console.error(error);
  }
})();
