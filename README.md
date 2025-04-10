First [set up the gcloud command line tool and authenticate with the project.](https://cloud.google.com/artifact-registry/docs/docker/authentication?_gl=1*ck2s1d*_ga*MTEwODAzOTc0LjE3MDg1NjE5MDE.*_ga_WH2QY8WWF5*MTcwOTIzODg5NC45LjEuMTcwOTIzOTE3Ni4wLjAuMA..&_ga=2.34531937.-110803974.1708561901).
This includes instructions for setting up the gcloud command line tool and authenticating with the registry on a Mac and Windows.

On linux, you can install the gcloud command line tool with:

    sudo snap install google-cloud-sdk --classic

### Using gcloud to access the registry

From each machine you intend to use for pushing (builds) or pulling (deployments) images, you will need to authenticate:

    gcloud auth login
    gcloud config set project ncsc-395717
    gcloud auth configure-docker us-west1-docker.pkg.dev
    gcloud config set run/region us-west1

### Setting up the Container Cloud Run service

1. Build your container image: If you haven't already, build your Docker image and push it to a container registry.

2. Create secrets files that are not stored in git.  Make sure there are no line endings.  You can
   create the files using `echo -n pass > facilitron-password.txt`.
   * `facilitron-email.txt`: Your email address for logging into Facilitron.
   * `facilitron-password.txt`: Your password for logging into Facilitron.
   * `.env`: Your environment variables for the container with both `FACILITRON_EMAIL` and `FACILITRON_PASSWORD` set to the values in the secrets files.
3. Add your secrets: Use the following commands to add your secrets:
```
gcloud secrets create FACILITRON_EMAIL --data-file=facilitron-email.txt
gcloud secrets create FACILITRON_PASSWORD --data-file=facilitron-password.txt
```
   and to update:

```
gcloud secrets versions add FACILITRON_EMAIL --data-file=facilitron-email.txt
gcloud secrets versions add FACILITRON_PASSWORD --data-file=facilitron-password.txt

```


4. Deploy your container: Use the following command to deploy your container:
```
gcloud run deploy ncsc-395717 \
    --image us-west1-docker.pkg.dev/ncsc-395717/facilitron-calendar/reservations-feed:latest \
    --region us-west1 \
    --allow-unauthenticated \
    --set-secrets=FACILITRON_EMAIL=projects/901799784728/secrets/FACILITRON_EMAIL:latest,FACILITRON_PASSWORD=projects/901799784728/secrets/FACILITRON_PASSWORD:latest
```

`--allow-unauthenticated` makes your service publicly accessible. If you need authentication, omit this flag.

### Mapping a domain name

```
gcloud beta run domain-mappings create \
    --service ncsc-395717 \
    --domain someaccess.live
```
