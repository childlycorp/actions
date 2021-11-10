const core = require("@actions/core");
const aws = require("aws-sdk");

async function getTaskFromTaskDefinitionArn(ecs, cluster, taskDefinitionArn) {
  const listResponse = await ecs
    .listTasks({
      cluster,
    })
    .promise();
  const { taskArns } = listResponse;
  const describeResponse = await ecs
    .describeTasks({
      cluster,
      tasks: taskArns,
    })
    .promise();
  const { tasks } = describeResponse;
  if (Array.isArray(tasks) && tasks.length) {
    const filteredTasks = tasks.filter(
      (task) => task.taskDefinitionArn === taskDefinitionArn
    );
    if (filteredTasks.length) {
      return filteredTasks[0];
    } else {
      throw new Error(
        `Could not find tasks from task definition ${taskDefinitionArn}`
      );
    }
  } else {
    throw new Error(
      `Could not find tasks from task definition ${taskDefinitionArn}`
    );
  }
}

async function getContainerInstanceFromArn(ecs, cluster, containerInstanceArn) {
  const describeResponse = await ecs
    .describeContainerInstances({
      containerInstances: [containerInstanceArn],
      cluster,
    })
    .promise();
  const { containerInstances } = describeResponse;

  if (Array.isArray(containerInstances) && containerInstances.length) {
    return containerInstances[0];
  } else {
    throw new Error(`Could not find containerInstance ${containerInstanceArn}`);
  }
}

async function getEC2InstanceIPFromInstanceId(ec2, ec2InstanceId) {
  const describeResponse = await ec2
    .describeInstances({
      InstanceIds: [ec2InstanceId],
    })
    .promise();
  const { Reservations } = describeResponse;
  const { PublicIpAddress, PublicDnsName } = Reservations[0].Instances[0];
  return { PublicIpAddress, PublicDnsName };
}

async function run() {
  try {
    const taskDefinitionArn = core.getInput("ecs-task-arn", { required: true });
    const cluster = core.getInput("ecs-cluster", { required: true });
    const ecs = new aws.ECS({
      customUserAgent: "amazon-ecs-deploy-task-definition-for-github-actions",
    });
    const ec2 = new aws.EC2({
      customUserAgent: "amazon-ecs-deploy-task-definition-for-github-actions",
    });
    const task = await getTaskFromTaskDefinitionArn(
      ecs,
      cluster,
      taskDefinitionArn
    );
    core.info(`Fetched task.`);
    const containerInstance = await getContainerInstanceFromArn(
      ecs,
      cluster,
      task.containerInstanceArn
    );
    core.info(`Fetched container instance.`);
    const {
      PublicIpAddress,
      PublicDnsName,
    } = await getEC2InstanceIPFromInstanceId(
      ec2,
      containerInstance.ec2InstanceId
    );
    core.info(`Fetched ip address`);
    core.setOutput("pr-public-ip", PublicIpAddress);
    core.setOutput("pr-public-dns-name", PublicDnsName);
  } catch (error) {
    core.setFailed(error.message);
    core.debug(error.stack);
  }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
  run();
}
