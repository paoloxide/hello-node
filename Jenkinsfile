def DEV_SERVER
def CUSTOM_WORKSPACE
def CUSTOM_WORKSPACE2
def CURRENT_BRANCH
def EXECUTION_TYPE
def DOCKER_SERVICE_NAME
def NODEJS_HOME
def PUBLISH_UNIT_TEST
def SERVICE_NAME
def SERVICE_VERSION
def SERVICE_REPOSITORY_URL
def SERVICE_REPOSITORY_BRANCH
def SERVICE_INBOUND_PORT
def SERVICE_OUTBOUND_PORT
def SONAR_HOME
def SONAR_SERVER_URL
def SONAR_LOGIN
def SONAR_PASSWORD
def SONAR_RUNNER_PROPERTIES
def UNIT_TEST
def BUILDSTAGE_STATUS
def DEPLOYSTAGE_STATUS
def TESTSTAGE_STATUS

def slacknotifyJob(String buildStatus = 'STARTED', String BUILDSTAGE_STATUS, String DEPLOYSTAGE_STATUS, String TESTSTAGE_STATUS, String CHANNEL, String TOKEN_ID) {
	buildStatus = buildStatus ?: 'SUCCESS'
	if (buildStatus == 'STARTED') {
		color = 'GRAY'
		colorCode = '#808080'
	} else if (buildStatus == 'UNSTABLE') {
		color = 'YELLOW'
		colorCode = '#FFFF00'
	} else if (buildStatus == 'SUCCESS') {
		color = 'GREEN'
		colorCode = '#00FF00'
	} else {
		color = 'RED'
		colorCode = '#FF0000'
	}
	header = "===== *STARTED* : '${env.JOB_NAME} [${env.BUILD_NUMBER}]' =====\n"
	body = "[ *BUILD STAGE* ]....................................................................................................[ *${BUILDSTAGE_STATUS}* ]\n     stage `Clean Workspace`\n     stage `Checkout Repository`\n     stage `Update Packages`\n     stage `Check Code Quality`\n     stage `Compress Project`\n\n[ *TEST STAGE* ]................................................................................................[ *${TESTSTAGE_STATUS}* ]\n     stage `Retrieve Compressed Service`\n     stage `Checkout Ansible Deployment Playbook`\n     stage `Run Unit Test in Playbook`\n     stage `FitNesse Acceptance Test`\n\n[ *DEPLOY STAGE* ].......................................................................................................[ *${DEPLOYSTAGE_STATUS}* ]\n     stage `Run Deployment in Playbook`\n"
	footer = "===== *${buildStatus}* : '${env.JOB_NAME} [${env.BUILD_NUMBER}]' =====\n (${env.BUILD_URL})"
	summary = "${header} \n${body} \n${footer}"
	slackSend (color: colorCode, message: summary, channel: CHANNEL, tokenCredentialId: TOKEN_ID)
}


//Set Parameters

node {
    NODEJS_HOME = tool name: 'ADOP NodeJS', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
    SONAR_HOME = tool name: 'ADOP SonarRunner 2.4'
    
    SONAR_SERVER_URL = sh(
        script: "echo ${env.SONAR_SERVER_URL}",
        returnStdout: true
    )

    withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'adopadmin-user',
    usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD']]) {
    
    	SONAR_LOGIN = env.USERNAME
    	SONAR_PASSWORD = env.PASSWORD

    }
    
    SONAR_RUNNER_PROPERTIES = "-Dsonar.host.url=${SONAR_SERVER_URL} -Dsonar.login=${SONAR_LOGIN} -Dsonar.password=${SONAR_PASSWORD} -Dsonar.jdbc.url=jdbc:mysql://sonar-mysql:3306/sonar"
    SONAR_RUNNER_PROPERTIES = SONAR_RUNNER_PROPERTIES.replaceAll("[\n\r]", "");
    
    def isService = sh (
        script: """
        if [ \$( pwd | sed "s/.*\\(Service_Pipelines\\).*/\\1/") = "Service_Pipelines" ]; then
                exit 0
            else
                exit 1
            fi
        """,
        returnStatus: true
    ) == 0
    
    echo "isService = ${isService}"
    
    def SERVICE = sh (
        script: """
        if [ ${isService} ]; then
            echo \$( pwd | rev | cut -d/ -f4 | rev )
        else
            echo "NULL"
        fi
        """,
        returnStdout: true
    ).trim()
    
    SERVICE_NAME = SERVICE
    if(SERVICE_NAME != "NULL") {
    EXECUTION_TYPE = "SERVICE"
    } else {
    EXECUTION_TYPE = "NON_SERVICE"
    }
    
    echo "SERVICE_NAME = ${SERVICE_NAME}"
    
    echo """ 
        SERVICE DETAILS:
		=================================
        SERVICE NAME: ${SERVICE_NAME}
        EXECUTION TYPE: ${EXECUTION_TYPE}
		=================================
    """
}

node("docker") {
	echo "Checking the Availability of the Node Command"
	def nodeExists = sh (
		script: """
		if [ "`docker exec jenkins ls /usr/bin/node`" == "/usr/bin/node" ]; then
			echo "Node command already exists."
			exit 0
		else
			echo "Node command does not exist. A soft link will be created for it."
			docker exec jenkins ln -s ${NODEJS_HOME}/bin/node /usr/bin/node
		fi
		""",
		returnStatus: true
	)
}

// Pipeline Stages
try{
	node {
		try {    
			CUSTOM_WORKSPACE = pwd()
			
			stage "Clean Workspace"
				sh "rm -rf ./*"
			
			stage "Checkout Repository"
				checkout scm

				CURRENT_BRANCH = sh( script: "pwd | rev | cut -d '/' -f2 | rev", returnStdout: true ).trim()
			
				if ( CURRENT_BRANCH != "develop" ) {
					echo "CI/CD Pipeline is not supported for branches other than develop."
					sh "echo 'Workspace contents will be deleted.'"
					sh "rm -rf ./*"
					sh "exit 0"
				}
				
				load "./jenkinsfile-config.groovy"					
				
				DEV_SERVER = ip_DEV_SERVER
				SERVICE_OUTBOUND_PORT_MOCK = port_DEV_SERVER_mock
				SERVICE_OUTBOUND_PORT_DEVELOP = port_DEV_SERVER_develop
				CHANNEL = slack_channel
				TOKEN_ID = slack_token_id
				
				SERVICE_OUTBOUND_PORT = SERVICE_OUTBOUND_PORT_DEVELOP
				SERVICE_INBOUND_PORT = port_DEV_SERVER_inbound
				
				UNIT_TEST = sh( script: """
				  if [ -d ./test ]; then
				    echo "PROCEED"
				  else
					echo "SKIP"
				  fi
				""", returnStdout: true ).trim()
				
				if ( UNIT_TEST == "PROCEED" ) {
					sh "echo Tests folder found!"
				} else {
					sh "echo Tests folder not found!"
				}
			
			stage "Update Packages"
				sh "pwd"
				sh "${NODEJS_HOME}/bin/npm install"
			
		    SERVICE_VERSION = sh( script: "grep 'version' package.json | cut -d ',' -f1 | cut -d ':' -f2 | cut -c3- | rev | cut -c2- | rev", returnStdout: true).trim()
			
			stage "Check Code Quality"
				sh """
					pwd && ls -lrta
				
					if [ -f ../../../sonar-project.properties ]; then
					  cp ../../../sonar-project.properties ./
					else
					  echo "Sonar project properties file does not exist."
					  exit 1
					fi

					pwd && ls -lrta ./

					if [ -f ./sonar-project.properties ]; then
					  sed -i "s/\$(grep sonar.projectKey ./sonar-project.properties )/&-${CURRENT_BRANCH}/g" ./sonar-project.properties
					  sed -i "s/\$(grep sonar.projectName ./sonar-project.properties )/&-${CURRENT_BRANCH}/g" ./sonar-project.properties
					  ${SONAR_HOME}/bin/sonar-runner ${SONAR_RUNNER_PROPERTIES}
					fi

				"""

			stage "Compress Project"
				sh """
					if [ ${EXECUTION_TYPE} = "SERVICE" ]; then
					  zip -r ybusa_${SERVICE_NAME}.zip *  
					fi
					pwd && ls -lart 
				"""
		    BUILDSTAGE_STATUS = "SUCCESS"
		} catch (e) {
			throw e
			BUILDSTAGE_STATUS = "FAILED"
		} 
	}

	if(EXECUTION_TYPE == "SERVICE") {
			DOCKER_SERVICE_NAME = "SERVICE_HOST_" + SERVICE_NAME
			DOCKER_SERVICE_NAME = DOCKER_SERVICE_NAME.toLowerCase()
			DOCKER_SERVICE_TAG = SERVICE_VERSION
	}

	echo """ 
			DOCKER IMAGE NAME AND TAG:
			============================================
			DOCKER SERVICE NAME: ${DOCKER_SERVICE_NAME}
			DOCKER SERVICE TAG: ${DOCKER_SERVICE_TAG}
			============================================
		"""
		
	node("ansible") {
		try {  
			CUSTOM_WORKSPACE2 = pwd()
			// withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'aws-environment-provisioning',
			// usernameVariable: 'AWS_ACCESS', passwordVariable: 'AWS_SECRET']]) {
			//   AWS_ACCESS = env.AWS_ACCESS
			//   AWS_SECRET = env.AWS_SECRET
			// }

			stage "Retrieve Compressed Service"
				sh "pwd && ls -lart"
				sh "docker cp jenkins:${CUSTOM_WORKSPACE}/ybusa_${SERVICE_NAME}.zip ."
				sh "pwd && ls -lart"

			stage "Checkout Ansible Deployment Playbook"
				git url: "ssh://git@innersource.accenture.com/adyb/ybusa-ansible-deployment.git", branch: "master", credentialsId: "adop-jenkins-master"
				sh("""  echo [dev_server] > hosts
						echo ${DEV_SERVER} >> hosts""")
				sh('cat hosts')
			
			stage "Run Unit Test in Playbook"
				sh "pwd && ls -larth"
				if( UNIT_TEST == "PROCEED" ) { 
					sshagent (credentials: ['ansible-user-key']) {
					  sh """
					    pwd && ls -lrtah
					    rm -f ${CUSTOM_WORKSPACE2}/mochawesome-reports.tar
					    pwd && ls -lrtah
					    ansible-playbook service_test.yml -i hosts -u ec2-user --extra-vars "service_name=${SERVICE_NAME} service_outbound_port=${SERVICE_OUTBOUND_PORT_MOCK} current_branch=${CURRENT_BRANCH} dev_server=${DEV_SERVER} custom_workspace=${CUSTOM_WORKSPACE} execution_type=${EXECUTION_TYPE} docker_service_name=${DOCKER_SERVICE_NAME}_mock docker_service_tag=${DOCKER_SERVICE_TAG} service_version=${SERVICE_VERSION}"
					    pwd && ls -lrtah
						
						ls -lrtah
					  """
					}

					// if [ -f ./mochawesome-reports.tar ]; then
					//       tar -xvf mochawesome-reports.tar -C ./
					// fi
					
					PUBLISH_UNIT_TEST = sh (
						script: """
							if [ -f ./mochawesome-reports.tar ]; then
					      		tar -xvf mochawesome-reports.tar -C ./
								exit 0
							else
								exit 1
					    	fi
						""",
						returnStatus: true
					) == 0

					echo "PUBLISH_UNIT_TEST = ${PUBLISH_UNIT_TEST}"

					if( "${PUBLISH_UNIT_TEST}" ) {
						publishHTML (target: [
							allowMissing: false,
							alwaysLinkToLastBuild: false,
							keepAll: true,
							reportDir: 'mochawesome-reports',
							reportFiles: 'mochawesome.html',
							reportName: "Mocha Unit Test Report"	
						])
						TESTSTAGE_STATUS = "SUCCESS"
					} else {
						echo "Cannot publish report. No data is available."
						currentBuild.result = "UNSTABLE"
						TESTSTAGE_STATUS = "FAILED"
					}

				} else {
					sh "echo Skipping Unit Test. There are no available test scripts in the test directory."
					currentBuild.result = "UNSTABLE"
					TESTSTAGE_STATUS = "UNSTABLE"
				}
			stage "FitNesse Acceptance Test"
	//			sh "docker exec fitnesse java -jar fitnesse-standalone.jar -c \"WebServiceTests.ServiceSuites.Profiles.AddEntrepreneurSkills?test&format=text\""
	//		 	echo "View Test History: http:///WebServiceTests.ServiceSuites.Profiles.AddEntrepreneurSkills?testHistory"
				
		} catch (e) {
			throw e
			TESTSTAGE_STATUS = "FAILED"
		}

		try {		
			if( TESTSTAGE_STATUS == "SUCCESS" || TESTSTAGE_STATUS == "UNSTABLE"  ) {
				if( TESTSTAGE_STATUS == "SUCCESS" ){ echo "Unit test passed. Proceeding to Deployment to Development Environment." }
				if( TESTSTAGE_STATUS == "UNSTABLE" ){ echo "Skipped Unit Test. Proceeding to Deployment to Development Environment." }
				
				stage "Run Deployment in Playbook"
					sshagent (credentials: ['ansible-user-key']) {
					  sh "ansible-playbook service_deploy.yml -i hosts -u ec2-user --extra-vars \"service_name=${SERVICE_NAME} service_outbound_port=${SERVICE_OUTBOUND_PORT} service_inbound_port=${SERVICE_INBOUND_PORT} dev_server=${DEV_SERVER} current_branch=${CURRENT_BRANCH} custom_workspace=${CUSTOM_WORKSPACE} execution_type=${EXECUTION_TYPE} docker_service_name=${DOCKER_SERVICE_NAME} docker_service_tag=${DOCKER_SERVICE_TAG} service_version=${SERVICE_VERSION}\" "
				    }

		//		stage "Run Production Deployment in Playbook"
		//			sshagent (credentials: ['ansible-user-key']) {
		//			sh "ansible-playbook service_production.yml -i hosts -u ec2-user --extra-vars \"aws_access=${AWS_ACCESS} aws_secret=${AWS_SECRET} service_name=${SERVICE_NAME} current_branch=${CURRENT_BRANCH} custom_workspace=${CUSTOM_WORKSPACE} execution_type=${EXECUTION_TYPE} docker_service_name=${DOCKER_SERVICE_NAME} docker_service_tag=${DOCKER_SERVICE_TAG} service_version=${SERVICE_VERSION}\" "
		//			}
				DEPLOYSTAGE_STATUS = "SUCCESS"
			} else {
				echo "Unit Test failed."
				DEPLOYSTAGE_STATUS = "FAILED"
			}
		} catch (e) {
			throw e
			DEPLOYSTAGE_STATUS = "FAILED"
		}
	}
} catch (e) {
		throw e
		if (BUILDSTAGE_STATUS == "FAILED" || DEPLOYSTAGE_STATUS == "FAILED" || TESTSTAGE_STATUS == "FAILED") {
			currentBuild.result = "FAILED"
		}
} finally {
		if (BUILDSTAGE_STATUS == null) {
			BUILDSTAGE_STATUS = "UNSTABLE"
		}
		if (TESTSTAGE_STATUS == null) {
			TESTSTAGE_STATUS = "UNSTABLE"
		}
		if (DEPLOYSTAGE_STATUS == null) {
			DEPLOYSTAGE_STATUS = "UNSTABLE"
		}
		
		if (BUILDSTAGE_STATUS == "UNSTABLE" || DEPLOYSTAGE_STATUS == "UNSTABLE" || TESTSTAGE_STATUS == "UNSTABLE") {
			currentBuild.result = "UNSTABLE"
		}
		
		slacknotifyJob(currentBuild.result,BUILDSTAGE_STATUS,DEPLOYSTAGE_STATUS,TESTSTAGE_STATUS,CHANNEL,TOKEN_ID)
}
