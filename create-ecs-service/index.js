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
    const inServiceName = core.getInput("ecs-service-name");
    const taskDefinition = core.getInput("ecs-task-definition-name");
    
    const {serviceArns} = await ecs.listServices({
        cluster: cluster,
    }).promise();

    core.info(`Setting output: serviceArns: ${(serviceArns) || ''}`);

    const arr1 = inServiceName.split("-");
    const orgNumber = arr1[arr1.length - 1];
    let serviceNames = [];

    let serviceName;

    if (serviceArns.length) {
        serviceArns.forEach(serviceArn => {
            const arr2 = serviceArn.split("-");
            const number = arr2[arr2.length - 1];

            if (number.startsWith(orgNumber)) {
                const arr3 = serviceArn.split("/");
                const serviceName = arr3[arr3.length - 1];
                serviceNames.push(serviceName);
            }
        });
        serviceNames.sort();
        // get last service
        const service = serviceNames[serviceNames.length - 1];
        // delete serviceName
        const response = await ecs.deleteService({service, cluster, force:true}).promise();
        core.info(`Service ${service} is deleted in cluster ${cluster}`);
        core.info(`Delete service: ${response}`);
        // generate service name
        const arr4 = service.split("-");
        const number = arr4[arr4.length - 1];
        const newNumber = String(Number(number) + 1);
        serviceName = service.replace(number, newNumber);
    }else{
        serviceName = inServiceName + "000";
    }

    core.info(`New service name: ${serviceName}`);

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