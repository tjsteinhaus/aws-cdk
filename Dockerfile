FROM node:10.14.1-alpine

LABEL "com.github.actions.name" = "Run AWK CDK Deploy"
LABEL "com.github.actions.description" = "Uses the new Deploy CLI"
LABEL "com.github.actions.icon" = "circle"
LABEL "com.github.actions.color" = "blue"

COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]