(function () {
	"use strict";

	angular.module("JahiaOAuthApp").controller("SofincoController", SofincoController);

	SofincoController.$inject = [
		"$location",
		"settingsService",
		"helperService",
		"i18nService",
		"jahiaContext",
	];

	function SofincoController($location, settingsService, helperService, i18nService, jahiaContext) {
		var vm = this;

		// Variables
		vm.expandedCard = false;
		vm.callbackUrl = "";

		// Functions
		vm.saveSettings = saveSettings;
		vm.goToMappers = goToMappers;
		vm.toggleCard = toggleCard;

		init();

		function saveSettings() {
			// Mandatory values can't be empty
			if (
				!vm.apiKey ||
				!vm.apiSecret ||
				!vm.authorizationBaseUrl ||
				!vm.accessTokenEndpoint ||
				!vm.userInfoEndpoint ||
				!vm.callbackUrl
			) {
				helperService.errorToast(
					i18nService.message("joant_sofincoOAuthView.message.error.missingMandatoryProperties"),
				);
				return false;
			}

			// the connectorServiceName here must be the SofincoApi naming contract
			settingsService
				.setConnectorData({
					connectorServiceName: "SofincoApi",
					properties: {
						enabled: vm.enabled,
						apiKey: vm.apiKey,
						apiSecret: vm.apiSecret,
						callbackUrl: vm.callbackUrl,
						scope: vm.scope,
						authorizationBaseUrl: vm.authorizationBaseUrl,
						accessTokenEndpoint: vm.accessTokenEndpoint,
						userInfoEndpoint: vm.userInfoEndpoint,
					},
				})
				.success(function () {
					vm.connectorHasSettings = true;
					helperService.successToast(
						i18nService.message("joant_sofincoOAuthView.message.succes.saveSuccess"),
					);
				})
				.error(function (data) {
					helperService.errorToast(
						i18nService.message("joant_sofincoOAuthView.message.label") + " " + data.error,
					);
				});
		}

		function goToMappers() {
			// the second part of the path must be the service name
			$location.path("/mappers/SofincoApi");
		}

		function toggleCard() {
			vm.expandedCard = !vm.expandedCard;
		}

		function init() {
			i18nService.addKey(sofincooai18n);
			vm.siteKey = jahiaContext.siteKey;

			settingsService
				.getConnectorData("SofincoApi", [
					"enabled",
					"apiKey",
					"apiSecret",
					"callbackUrl",
					"scope",
					"authorizationBaseUrl",
					"accessTokenEndpoint",
					"userInfoEndpoint",
				])
				.success(function (data) {
					if (data && !angular.equals(data, {})) {
						vm.connectorHasSettings = true;
						vm.enabled = data.enabled;
						vm.apiKey = data.apiKey;
						vm.apiSecret = data.apiSecret;
						vm.callbackUrl = data.callbackUrl;
						vm.scope = data.scope;
						vm.authorizationBaseUrl = data.authorizationBaseUrl;
						vm.accessTokenEndpoint = data.accessTokenEndpoint;
						vm.userInfoEndpoint = data.userInfoEndpoint;
						vm.expandedCard = true;
					} else {
						vm.connectorHasSettings = false;
						vm.enabled = false;
						vm.scope = "openid profile email";
					}
				})
				.error(function (data) {
					helperService.errorToast(
						i18nService.message("joant_sofincoOAuthView.message.label") + " " + data.error,
					);
				});
		}
	}
})();
