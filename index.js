const ora = require("ora");
const { spawn, exec } = require("child-process-promise");

async function parseEnvVars() {
  const envOutput = await exec("docker-machine env --shell bash clash");
  const re = /export (\w+)="(.+?)"/gm;

  const env = {};
  for (let match; (match = re.exec(envOutput.stdout)); ) {
    const [_, name, value] = match;
    env[name] = value;
  }

  return env;
}

(async function() {
  try {
    const spinner = ora(`Reading up environment variables for [clash] machine...`).start();
    const env = await parseEnvVars();

    spinner.text = "Executing ps...";
    const test = await exec("docker ps", { env });

    console.log(test.stdout);

    spinner.succeed("Done");
  } catch (error) {
    console.error(error);
  }
})();
