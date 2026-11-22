# Use an n8n community node in Tabular

Tabular can show a community node on its canvas and send connected Tabular data
to a workflow in your n8n instance. The community package runs in n8n. Tabular
does not install or execute npm community packages itself.

## Set up a working node

1. Install the package in your n8n instance, following n8n's community node
   instructions. Check the package's publisher and permissions before installing.
2. Create an n8n workflow with a **Webhook** trigger using `POST`, the community
   node, and **Respond to Webhook**. Connect them in that order. In the Webhook
   trigger, choose **Using Respond to Webhook Node** as the response mode.
3. Configure the community node for the request body. Tabular sends JSON shaped
   like this:

   ```json
   {
     "source": "Tabular",
     "communityNode": { "name": "Example", "package": "n8n-nodes-example" },
     "inputs": {
       "Columns": { "fields": [{ "header": "Temperature", "description": "Air temperature" }] }
     }
   }
   ```

4. In Tabular, add **n8n community node** from the node palette. Enter the name
   and package you installed, then paste the n8n Webhook test or production URL.
   Use an HTTPS URL for a remote instance. A local n8n instance can use HTTP.
5. Connect a Tabular node to the left handle. Open **Data to send** to inspect
   the JSON snapshot before sending it. Choose **Run**. Inspect the returned
   JSON in the node or choose **Download result**. The right handle can feed
   another n8n node or a Python script node.

For a test URL, start listening for a test event in n8n before choosing **Run**.
For routine use, activate the n8n workflow and use its production URL. The
workflow must return within 30 seconds, and each request and response is limited
to 1 MB. Configure the webhook to return JSON if you want structured results;
plain text is returned under a `text` key.

If the n8n Webhook requires header authentication, expand **Webhook
authentication** in the Tabular node and enter the header name and value. The
configured URL and secret stay in the current Tabular session. Workflow exports
and **My nodes** entries omit them and omit the previous n8n response. You must
enter them again after importing or reusing a node. The data shown under **Data
to send** leaves Tabular only when you choose **Run**.

This integration sends JSON snapshots, including selected table rows where a
Tabular file is connected. It does not upload binary files or automatically
install community packages. Which data the community node uses and what it
returns are determined by your n8n workflow.

---

[Documentation guide](README.md) · [Repository README](../README.md)
