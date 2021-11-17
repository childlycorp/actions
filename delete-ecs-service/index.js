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
    try{
        const ecs = new aws.ECS({
            customUserAgent: 'amazon-ecs-deploy-task-definition-for-github-actions'
        });
        const cluster = core.getInput("ecs-cluster-name");
        const serviceName = core.getInput("ecs-service-name");
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