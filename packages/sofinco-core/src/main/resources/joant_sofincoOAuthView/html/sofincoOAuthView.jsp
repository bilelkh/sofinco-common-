<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="ui" uri="http://www.jahia.org/tags/uiComponentsLib" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="query" uri="http://www.jahia.org/tags/queryLib" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="s" uri="http://www.jahia.org/tags/search" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>

<template:addResources type="javascript" resources="i18n/sofinco-oauth-connector-i18n_${renderContext.UILocale}.js" var="i18nJSFile"/>
<c:if test="${empty i18nJSFile}">
    <template:addResources type="javascript" resources="i18n/sofinco-oauth-connector-i18n_en.js"/>
</c:if>

<template:addResources type="javascript" resources="sofinco-oauth-connector/sofinco-controller.js"/>

<md-card ng-controller="SofincoController as sofincoCtrl">
    <div layout="row">
        <md-card-title flex>
            <md-card-title-text>
                <span class="md-headline" message-key="joant_sofincoOAuthView"></span>
            </md-card-title-text>
        </md-card-title>
        <div flex layout="row" layout-align="end center">
            <md-button class="md-icon-button" ng-click="sofincoCtrl.toggleCard()">
                <md-tooltip md-direction="top">
                    <span message-key="joant_sofincoOAuthView.tooltip.toggleSettings"></span>
                </md-tooltip>
                <md-icon ng-show="!sofincoCtrl.expandedCard">
                    keyboard_arrow_down
                </md-icon>
                <md-icon ng-show="sofincoCtrl.expandedCard">
                    keyboard_arrow_up
                </md-icon>
            </md-button>
        </div>
    </div>

    <md-card-content layout="column" ng-show="sofincoCtrl.expandedCard">
        <form name="sofincoForm">
            <div layout="row">
                <md-switch ng-model="sofincoCtrl.enabled">
                    <span message-key="joant_sofincoOAuthView.label.activate"></span>
                </md-switch>
            </div>

            <div layout="row">
                <md-input-container flex>
                    <label message-key="joant_sofincoOAuthView.label.apiKey"></label>
                    <input type="text" ng-model="sofincoCtrl.apiKey" name="apiKey" required>
                    <div ng-messages="sofincoForm.apiKey.$error" role="alert">
                        <div ng-message="required" message-key="joant_sofincoOAuthView.error.apiKey.required"></div>
                    </div>
                </md-input-container>

                <div flex="5"></div>

                <md-input-container flex>
                    <label message-key="joant_sofincoOAuthView.label.apiSecret"></label>
                    <input type="password" ng-model="sofincoCtrl.apiSecret" name="apiSecret" required>
                    <div ng-messages="sofincoForm.apiSecret.$error" role="alert">
                        <div ng-message="required" message-key="joant_sofincoOAuthView.error.apiSecret.required"></div>
                    </div>
                </md-input-container>
            </div>

            <div layout="row">
                <md-input-container class="md-block" flex>
                    <label message-key="joant_sofincoOAuthView.label.scope"></label>
                    <input type="text" ng-model="sofincoCtrl.scope" name="scope">
                    <div class="hint" message-key="joant_sofincoOAuthView.hint.scope"></div>
                </md-input-container>
            </div>

            <div layout="row">
                <md-input-container class="md-block" flex>
                    <label message-key="joant_sofincoOAuthView.label.authorizationBaseUrl"></label>
                    <input type="url" ng-model="sofincoCtrl.authorizationBaseUrl" name="authorizationBaseUrl" required>
                    <div ng-messages="sofincoForm.authorizationBaseUrl.$error" role="alert">
                        <div ng-message="required" message-key="joant_sofincoOAuthView.error.authorizationBaseUrl.required"></div>
                    </div>
                </md-input-container>
            </div>

            <div layout="row">
                <md-input-container class="md-block" flex>
                    <label message-key="joant_sofincoOAuthView.label.accessTokenEndpoint"></label>
                    <input type="url" ng-model="sofincoCtrl.accessTokenEndpoint" name="accessTokenEndpoint" required>
                    <div ng-messages="sofincoForm.accessTokenEndpoint.$error" role="alert">
                        <div ng-message="required" message-key="joant_sofincoOAuthView.error.accessTokenEndpoint.required"></div>
                    </div>
                </md-input-container>
            </div>

            <div layout="row">
                <md-input-container class="md-block" flex>
                    <label message-key="joant_sofincoOAuthView.label.userInfoEndpoint"></label>
                    <input type="url" ng-model="sofincoCtrl.userInfoEndpoint" name="userInfoEndpoint" required>
                    <div ng-messages="sofincoForm.userInfoEndpoint.$error" role="alert">
                        <div ng-message="required" message-key="joant_sofincoOAuthView.error.userInfoEndpoint.required"></div>
                    </div>
                </md-input-container>
            </div>

            <div layout="row">
                <md-input-container class="md-block" flex>
                    <label message-key="joant_sofincoOAuthView.label.callbackURL"></label>
                    <input type="url" ng-model="sofincoCtrl.callbackUrl" name="callbackUrl">
                    <div class="hint" ng-show="sofincoForm.callbackUrl.$valid" message-key="joant_sofincoOAuthView.hint.callbackURL"></div>
                    <div ng-messages="sofincoForm.callbackUrl.$error" ng-show="sofincoForm.callbackUrl.$invalid" role="alert">
                        <div ng-message="url" message-key="joant_sofincoOAuthView.error.callbackURL.notAValidURL"></div>
                    </div>
                </md-input-container>
            </div>
        </form>

        <md-card-actions layout="row" layout-align="end center">
            <md-button class="md-accent" message-key="joant_sofincoOAuthView.label.mappers"
                       ng-click="sofincoCtrl.goToMappers()"
                       ng-show="sofincoCtrl.connectorHasSettings">
            </md-button>
            <md-button class="md-accent" message-key="joant_sofincoOAuthView.label.save"
                       ng-click="sofincoCtrl.saveSettings()">
            </md-button>
        </md-card-actions>

    </md-card-content>
</md-card>
