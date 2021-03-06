#!/usr/bin/env node

const ora = require('ora');
const ProgressBar = require('progress');
const { spawn, exec } = require('child-process-promise');
const debug = require('debug')('docker-machine-deploy');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const readFileAsync = promisify(fs.readFile);

async function parseConfig() {
  const file = path.resolve(process.cwd(), '.docker-machine-deploy.json');
  const json = await readFileAsync(file, 'utf8');
  return JSON.parse(json);
}

async function parseDockerEnv({ machine }) {
  const { stdout } = await exec(`docker-machine env --shell bash ${machine}`);
  const re = /export (\w+)="(.+?)"/gm;

  const env = {};
  for (let match = re.exec(stdout); match; match = re.exec(stdout)) {
    const [, name, value] = match;
    env[name] = value;
  }

  return env;
}

const projectName = ({ name }) => (name ? `-p ${name}` : '');

async function dockerBuild(config) {
  const buildRe = /^Building .+$/m;
  const stepRe = /^Step (\d+)\/(\d+) : .+/m;

  const promise = spawn('docker-compose', [projectName(config), 'build']);
  const { childProcess } = promise;

  let progress;
  let buildingMessage;

  childProcess.stderr.on('data', (data) => {
    const line = data.toString();
    debug(line);
    const match = line.match(buildRe);

    if (match) {
      buildingMessage = line.trim();
      progress = null;
    }
  });

  childProcess.stdout.on('data', (data) => {
    const line = data.toString();
    debug(line);
    const match = line.match(stepRe);

    if (match) {
      let [, step, total] = match;
      step = Number(step);
      total = Number(total);

      if (!progress) {
        progress = new ProgressBar(`${buildingMessage} :bar :current/:total`, {
          total,
          width: 40,
        });
      } else {
        progress.curr = step;
        progress.render();
      }
    }
  });

  return promise;
}

const maxBuffer = 1024 * 1024 * 10; // 10mb

async function run(command, args, options, config) {
  debug(`${command} ${[projectName(config), ...args].join(' ')}`);
  const promise = spawn(command, [projectName(config), ...args], options);
  const { childProcess } = promise;

  if (debug.enabled) {
    childProcess.stderr.on('data', data => debug(data.toString()));
    childProcess.stdout.on('data', data => debug(data.toString()));
  }

  await promise;
}

const parseComposeFiles = ({ 'additional-compose-files': composeFiles }) => {
  if (composeFiles) {
    return ['docker-compose.yml', ...composeFiles].reduce(
      (params, p) => params.concat(['-f', p]),
      [],
    );
  }
  return ['-f', 'docker-compose.yml'];
};

(async () => {
  const spinner = ora();
  try {
    spinner.start('Parsing config file...');
    const config = await parseConfig();
    spinner.succeed('Config file read successfully.');
    debug('Found config file %O', config);

    spinner.start(`Reading env variables for [${config.machine}]...`);
    const env = await parseDockerEnv(config);
    env.PATH = env.PATH || '/usr/local/bin:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin';
    spinner.succeed(`Found machine env variables for [${config.machine}].`);
    debug('%O', env);

    await dockerBuild(config);
    spinner.succeed('Successfully built images.');

    spinner.start('Pushing images...');
    await run('docker-compose', ['-f', 'docker-compose.yml', 'push'], { maxBuffer }, config);
    spinner.succeed('Images successfully pushed.');

    spinner.start('Pulling images to remote machine...');
    await run(
      'docker-compose',
      ['-f', 'docker-compose.yml', 'pull'],
      {
        env,
        maxBuffer,
      },
      config,
    );
    spinner.succeed('Images successfully pulled.');

    spinner.start('Deploying new images...');
    const composeFiles = parseComposeFiles(config);
    await run(
      'docker-compose',
      [...composeFiles, 'up', '-d', '--remove-orphans'],
      {
        env,
        maxBuffer,
      },
      config,
    );
    spinner.succeed('Images successfully updated.');

    spinner.succeed('Done');
  } catch (error) {
    spinner.fail(error.message);
    console.error(error); // eslint-disable-line no-console
  }
})();
