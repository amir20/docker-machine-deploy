# What is `docker-machine-deploy`?
`docker-machine-deploy` deploys docker applications to remote host using docker-machine. It supports `docker-compose` and `docker-swarm` with `stacks`. 

# Why? 
I work on multiple projects. Each project usually had a `deploy.sh` script that looked something like this: 

```bash
docker-compose -f docker-compose.yml build 

msg "Pushing images..."
docker-compose -f docker-compose.yml push

msg "Updating docker-machine to name..."
eval $(docker-machine env --shell bash machine)

msg "Deploying with docker..."
docker-compose -f docker-compose.yml pull
docker-compose -f docker-compose.yml up -d --remove-orphans
...
```

I ended up having three respositories with this script. After a while, I realized that I am doing a lot of repeated work that can be better if the DRY model was followed. 

# Why node? 
Almost every project I deploy is a web project. They all have a `package.json` with `webpack`. Knowing that most of my projects use `Node`, it made sense to have a build took also in `package.json`.

# Installation 
Install using 

```
npm i --save-dev docker-machine-deploy
```

Then create `.docker-machine-deploy.json` with

```json
{
  "machine": "machine-name",
  "mode": "compose",
  "build": "local"
}
```

And finally, add something like this to your `package.json`

``` json
"scripts": {
    "docker-deploy": "docker-machine-deploy"
}
```

You can then deploy using `npm run docker-deploy`

# Configuration Options 
All confugrations should be in `.docker-machine-deploy.json`. 

| Name | Default Value | Description 
|-----------|----------------|-------------------------------------------------------------------------------------------|
| machine   |                | Docker macine name to use. This should be a machine that is listed in `docker-machine ls` | 
| mode      | `"compose"`    | Accepted values can be `compose` or `swarm` to create stack. See below for more details.  |
| build     | `"local"`      | Accepted values are `remote` or `local`. If `local`, then builds are done locally and then pushed to docker registry where it is then pulled to remote host. If `remote`, it is built on the remote host. If you have limited memory then build locally. |

## Supported Modes

Work in progress 

# Debuging deployment 
This module use debug module which can be enabled by doing `DEBUG=* npm run docker-deploy`


## Contributing

  This package is under development. Pull requests are welcomed.

## People

  The current lead maintainer is [Amir Raminfar](https://github.com/amir20)

## License

  [MIT](LICENSE.md)
