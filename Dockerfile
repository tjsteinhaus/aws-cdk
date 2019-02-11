FROM node:10.14.1-alpine

LABEL "com.github.actions.name" = "Run AWK CDK Deploy"
LABEL "com.github.actions.description" = "Uses the new Deploy CLI"
LABEL "com.github.actions.icon" = "circle"
LABEL "com.github.actions.color" = "blue"

RUN apk --no-cache add \
	ca-certificates \
	groff \
	less \
	python \
	py2-pip \
	&& pip install awscli \
	&& mkdir -p /root/.aws \
	&& { \
		echo '[default]'; \
		echo 'output = $AWS_DEFAULT_OUTPUT'; \
		echo 'region = $AWS_DEFAULT_REGION'; \
		echo 'aws_access_key_id = $AWS_ACCESS_KEY_ID'; \
		echo 'aws_secret_access_key = $AWS_SECRET_ACCESS_KEY'; \
	} > /root/.aws/config

COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]