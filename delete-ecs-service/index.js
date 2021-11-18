const aws = require('aws-sdk');
const core = require('@actions/core');

async function descaleService(ecs, {cluster, service}){
    const response = await ecs.updateService({
        service,
        cluster,
        "desiredCount": 0,
    }).promise();
    core.info(`Service ${service} is scaled to 0 in cluster ${cluster}`);
    return response;
}

async function deleteService(ecs, {cluster, service}){
  
    const descaleResponse = await descaleService(ecs, {cluster, service});
    const force = true;
    const response = await ecs.deleteService({
        service,
        cluster,
        force
    }).promise();
    core.info(`Service ${service} is deleted in cluster ${cluster}`);
    return response;
}

async function run(){
    const ecs = new aws.ECS({
        customUserAgent: 'amazon-ecs-deploy-task-definition-for-github-actions'
    });
    const cluster = core.getInput("ecs-cluster-name");
    const inServiceName = core.getInput("ecs-service-name");
    
    const {serviceArns} = await ecs.listServices({
        cluster: cluster,
    }).promise();

    core.info(`Setting output: serviceArns: ${(serviceArns) || ''}`);

    const arr1 = inServiceName.split("-");
    const orgNumber = arr1[arr1.length - 1];
    let serviceNames = [];

    let serviceName = undefined;

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

        if (serviceNames.length) {
            serviceNames.sort();
            // get last service
            const service = serviceNames[serviceNames.length - 1];
            serviceName = service;
        }
    }
    if (!serviceName) {
        serviceName = inServiceName + "000";
    }
    
    try{
        await deleteService(ecs, {
            cluster,
            service: serviceName
        });
    }  catch(error){
        core.setFailed(error);
        core.info(error);
    }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
    run();
}