// ==UserScript==
// @name         Jira auto HubSpot adder
// @namespace    https://bettyblocks.atlassian.net/
// @version      1.1
// @description  Automatically set the HubSpot id based on an organisation id
// @updateURL    https://raw.githubusercontent.com/Pandabweer/tampermonkey-scripts/refs/heads/main/jira-auto-fill/script.js
// @downloadURL  https://raw.githubusercontent.com/Pandabweer/tampermonkey-scripts/refs/heads/main/jira-auto-fill/script.js
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
    270: { name: "Betty Blocks", hubId: 12345 },
  };

  function getIdByName(targetName) {
    for (const id in mappingHubSpot) {
      if (mappingHubSpot[id].name === targetName) {
        return id; // Return the matching key
      }
    }
    return null; // Return null if not found
  }
  const originalUrl = window.location.href

  const techsupIndex = originalUrl.indexOf("TECHSUP");

  const extractedPart = originalUrl.slice(techsupIndex);

  const newBaseUrl = "/rest/api/2/issue/";

  const newUrl = newBaseUrl + encodeURIComponent(extractedPart);
  const theFetch = (org) => {
    const customField = 'customfield_10121'
    const fetched = fetch(
      `${newUrl}?fieldEditSessionId=${this.trackingSession.sessionIdentifier}`,
      {
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/javascript, */*",
        },
        method: "PUT",
        body: JSON.stringify({
          fields: {
            [customField]: `${org.hubId}`,
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
    return fetched
  }
  const organinasationCheck = async () => {
    const organisationElem = document.querySelector(
      '[aria-label="Edit Organizations, edit"]',
    ).parentElement.children[1].children[0].children[0];
    const hubspotIdElems = document.querySelector(
      '[aria-label="Edit HubSpot ID, edit"]',
    ).parentElement.children[1].children[0].children[0];
    let fieldValue = organisationElem.value || organisationElem.innerText.trim()
    const orgID = [getIdByName(fieldValue)]
    const orgObject = mappingHubSpot[orgID[0]]
    if (orgObject) {
      theFetch(orgObject)
      hubspotIdElems.textContent =
        `Auto added: ${orgObject.name} (${orgObject.hubId})`
    } else {
      hubspotIdElems.textContent = `Uknown organisation id: ${orgID}`;
    }


  }

  window.addEventListener('load', function () {
    organinasationCheck()
    console.log('Page fully loaded');
  });
  window.fetch = async function (...args) {
    let [url, request] = args;

    const fieldFunction = () => {
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
        console.log("yurrrr", orgObj)

        if (orgObj) {
          theFetch(orgObj)
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


    // Check if it's a form update
    if (url.startsWith("/rest/api/2/issue/") && request.method === "PUT") {
      // Check if the orginisation is being updated
      if (request.body.includes('"customfield_10002":')) {
        fieldFunction()
      }
    }

    const response = await originalFetch.apply(this, args);
    return response;
  };
})();