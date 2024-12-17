// ==UserScript==
// @name         Jira auto HubSpot adder
// @namespace    https://bettyblocks.atlassian.net/
// @version      1.0
// @description  Automatically set the HubSpot id based on an organisation id
// @author       Enrique Bos
// @match        https://bettyblocks.atlassian.net/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=atlassian.net
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  const originalFetch = window.fetch;
  const mappingHubSpot = {
    406: { name: "Mazars", hubId: 6793782797 },
    263: { name: "DailyOps", hubId: 850557318 },
    259: { name: "de Politie", hubId: 579614642 },
    270: { name: "Betty Blocks", hubId: "N/A" },
  };

  window.fetch = async function (...args) {
    let [url, request] = args;

    // Check if it's a form update
    if (url.startsWith("/rest/api/2/issue/") && request.method === "PUT") {
      // Check if the orginisation is being updated
      if (request.body.includes('"customfield_10002":')) {
        const organisationsIds = JSON.parse(request.body.match(/\[.*]/)[0]);
        const hubspotIdElem = document.querySelector(
          '[aria-label="Edit HubSpot ID, edit"]',
        ).parentElement.children[1].children[0].children[0];
        const isBettyAddition =
          organisationsIds.length === 2 && organisationsIds.includes(270);

        if (organisationsIds.length === 1 || isBettyAddition) {
          const orgId = isBettyAddition
            ? organisationsIds.filter((e) => e !== 270)[0]
            : organisationsIds[0];
          const orgObj = mappingHubSpot[orgId];

          if (orgObj) {
            fetch(
              `${url}?fieldEditSessionId=${this.trackingSession.sessionIdentifier}`,
              {
                credentials: "same-origin",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json, text/javascript, */*",
                },
                method: "PUT",
                body: JSON.stringify({
                  fields: {
                    customfield_10121: `${orgObj.hubId}`,
                  },
                }),
              },
            )
              .then((response) => {
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
              })
              .then((data) => console.log("Response data:", data))
              .catch((error) => console.error("Error:", error));

            hubspotIdElem.textContent =
              `Auto added: ${orgObj.name} (${orgObj.hubId})` +
              (isBettyAddition ? " (Ignored Betty Blocks)" : "");
          } else {
            hubspotIdElem.textContent = `Uknown organisation id: ${orgId}`;
          }
        } else {
          if (organisationsIds.length !== 0) {
            hubspotIdElem.textContent =
              "Found multiple organisations:\n" +
              organisationsIds
                .filter((e) => e !== 270)
                .map((id) => {
                  const orgObj = mappingHubSpot[id];

                  if (mappingHubSpot[id]) {
                    return `${orgObj.name} (${orgObj.hubId})`;
                  } else {
                    return `Uknown organisation id: ${id}`;
                  }
                })
                .join("\n") +
              "\n\nCopy the right code and edit the field or leave empty (No update)";
          }
        }
      }
    }

    const response = await originalFetch.apply(this, args);
    return response;
  };
})();
