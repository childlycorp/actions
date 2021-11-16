const core = require('@actions/core');
const github = require('@actions/github')


async function run(){
  try {

    // Get input parameters.
    const token = core.getInput('token')
    const body = core.getInput('body')
    const prNumber = core.getInput('pr-number')
    const repository = core.getInput("repository")
    
    core.debug(`body: ${body}`)
    core.debug(`prNumber: ${prNumber}`)

    // Create a GitHub client.
    const octokit = new github.getOctokit(token)

    // Get owner and repo from
    const [owner, repo] = repository.split("/");

    // Create a comment on PR
    // https://octokit.github.io/rest.js/#octokit-routes-issues-create-comment
    const response = await octokit.issues.createComment({
      owner,
      repo,
      // eslint-disable-next-line @typescript-eslint/camelcase
      issue_number: prNumber,
      body
    })
    core.debug(`created comment URL: ${response.data.html_url}`)
    core.setOutput('comment-url', response.data.html_url)
  } catch (error) {
    core.setFailed(error.message)
  }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
    run();
}