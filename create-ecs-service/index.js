const core = require('@actions/core');
const aws = require('aws-sdk');


async function createService(ecs, {
    cluster,
    serviceName,
    taskDefinition,    
    ...rest
}){
    const params = {
        serviceName, 
        taskDefinition,       
        cluster,
        ...rest
    }
    try{
      const {services} = await ecs.describeServices({
          cluster,
          services: [serviceName]
      }).promise();
      if(services.length){
          core.info(`Service ${serviceName} already exists in ${cluster}`)
          core.info(`Not creating a new service`);
          return;
      }
    }catch(error){
        console.log(error);
    }
    const response = await ecs.createService(params).promise();
    const {service} = response;
    core.info(`Service ${serviceName} is created in cluster ${cluster} with status ${service.status}`);
    return service;
}

async function run(){
    const ecs = new aws.ECS({
        customUserAgent: 'amazon-ecs-deploy-task-definition-for-github-actions'
    });
    const cluster = core.getInput("ecs-cluster-name");
    const serviceName = core.getInput("ecs-service-name");
    const taskDefinition = core.getInput("ecs-task-definition-name");
    
    try{
      await createService(ecs,{
        cluster,
        serviceName,
        taskDefinition,
        desiredCount: 1,
        "deploymentConfiguration": { 
            "maximumPercent": 200,
            "minimumHealthyPercent": 50
         },
    });   
    }catch(error){
      core.setFailed(error)
    }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
  run();
}