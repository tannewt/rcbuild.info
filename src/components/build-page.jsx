import React from "react";

import Alert from "react-bootstrap/lib/Alert";
import ButtonGroup from "react-bootstrap/lib/ButtonGroup";
import Button from "react-bootstrap/lib/Button";
import Row from "react-bootstrap/lib/Row";
import Col from "react-bootstrap/lib/Col";
import Panel from "react-bootstrap/lib/Panel";

import BuildActions from "../actions/build-actions";
import BuildParts from "./build-parts";
import SiteActions from "../actions/site-actions";
import FlightControllerSettings from "./fc-settings";

import BuildStore from "../stores/build-store";
import PartStore from "../stores/part-store";
import SiteStore from "../stores/site-store";

import ButtonLink from "react-router-bootstrap/lib/ButtonLink";

export default class BuildPage extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
    this.onCreateBuild = this.onCreateBuild.bind(this);
    this.onShareDismiss = this.onShareDismiss.bind(this);
    this.onBuildChange = this.onBuildChange.bind(this);
    this.onPartChange = this.onPartChange.bind(this);
    this.onSiteChange = this.onSiteChange.bind(this);
    this.onDiscardChanges = this.onDiscardChanges.bind(this);
    this.lastBuildState = "";
    this.state = {"editing": false,
                  "share": false,
                  "primaryBuildVersion": undefined,
                  "primaryBuild": undefined,
                  "partStore": undefined};
  }

  componentDidMount() {
    BuildStore.listen(this.onBuildChange);
    PartStore.listen(this.onPartChange);
    SiteStore.listen(this.onSiteChange);

    this.onSiteChange(SiteStore.getState());
    this.onPartChange(PartStore.getState());
    this.onBuildChange(BuildStore.getState());
  }

  componentWillUnmount() {
    BuildStore.unlisten(this.onBuildChange);
    PartStore.unlisten(this.onPartChange);
    SiteStore.unlisten(this.onSiteChange);
  }

  // These three functions sync our internal state to the backing stores.
  onBuildChange(state) {
    if (this.state.primaryBuildVersion) {
      let primaryBuild = state.builds[this.state.primaryBuildVersion.key];
      let share = this.state.share ||
                  (primaryBuild &&
                   primaryBuild.state === "exists" &&
                   this.lastBuildState === "saving");
      // Copy the build state over because the primaryBuild object can actually
      // the same one we already have with the updated state.
      if (primaryBuild) {
        this.lastBuildState = primaryBuild.state;
      }
      this.setState({"primaryBuild": primaryBuild,
                     "share": share});
    }
  }
  onPartChange(state) {
    this.setState({"partStore": state});
  }
  onSiteChange(state) {
    let ownerLoggedIn = false;
    let primaryBuild;
    if (state.primaryBuildVersion) {
      ownerLoggedIn = state.loggedInUser === state.primaryBuildVersion.user;
      primaryBuild = BuildStore.getState().builds[state.primaryBuildVersion.key];
      if (primaryBuild) {
        this.lastBuildState = primaryBuild.state;
      }
    }
    this.setState({"editing": state.page === "editbuild",
                   "ownerLoggedIn": ownerLoggedIn,
                   "primaryBuildVersion": state.primaryBuildVersion,
                   "primaryBuild": primaryBuild});
  }

  onCreateBuild() {
    BuildActions.createBuild(this.state.primaryBuildVersion);
  }

  onSaveBuild() {
    BuildActions.saveBuild();
  }

  onDiscardChanges() {
    SiteActions.discardBuild();
  }

  onShareDismiss() {
    this.setState({"share": false});
  }

  render() {
    if (this.state.primaryBuild === undefined) {
      return null;
    }

    if (this.state.primaryBuild.state === "exists" ||
        this.state.primaryBuild.state === "unsaved" ||
        this.state.primaryBuild.state === "saving") {
      let banner = null;

      if (this.state.editing) {
        banner = (<Row><Col md={6}>
                      <Panel>
                        <ButtonGroup fill justified>
                          <ButtonLink bsStyle="success"
                                  disabled={this.state.primaryBuild.state !== "unsaved"}
                                  onClick={this.onSaveBuild} params={{"user": this.state.primaryBuildVersion.user, "branch": this.state.primaryBuildVersion.branch}} to="build">Save changes</ButtonLink>
                          <ButtonLink bsStyle="danger" onClick={this.onDiscardChanges} params={{"user": this.state.primaryBuildVersion.user, "branch": this.state.primaryBuildVersion.branch}} to="build">Discard Changes</ButtonLink>
                        </ButtonGroup>
                      </Panel>
                    </Col>
                    </Row>);
      } else if (this.state.primaryBuild.state === "saving") {
        banner = (<Row><Col md={12}><Alert bsStyle="info" fill><strong>Saving</strong> Hold on, your build is saving.</Alert>
                  </Col>
                  </Row>);
      } else if (this.state.primaryBuild.state === "save-failed") {
        banner = (<Row><Col md={12}><Alert bsStyle="danger" fill><strong>Save failed!</strong> This is currently unhandled. :-(</Alert>
                  </Col>
                  </Row>);
      } else if (this.state.share) {
          banner = (<Row><Col md={12}><Alert bsStyle="success" fill onDismiss={this.onShareDismiss}><strong>Saved!</strong> Your build is saved. <a href={window.location}>Link here</a> to share this build!</Alert>
        </Col>
        </Row>);
      }
      return (<div>{banner}
          <Row>

                <Col md={6}>
                  <BuildParts editing={this.state.editing} fill
                              ownerLoggedIn={this.state.ownerLoggedIn}
                              partStore={this.state.partStore}
                              parts={this.state.primaryBuild.parts}/>
                </Col>
                <Col md={6}>
                  <FlightControllerSettings editing={this.state.editing}
                                            primarySettings={this.state.primaryBuild.settings.fc}/>
                </Col>
              </Row>
                {banner}</div>);
    } else if (this.state.primaryBuild.state === "does-not-exist") {
      if (this.state.ownerLoggedIn) {
        return (<Row>
                  <Col md={12}>
                    <Panel>
                      Are you sure you want to create a build called "{ this.state.primaryBuildVersion.branch }"?<hr/>
                      <Button bsStyle="success" onClick={ this.onCreateBuild }>Yes</Button>
                      &nbsp;
                      <ButtonLink bsStyle="danger" to="createbuild">No</ButtonLink>
                    </Panel>
                  </Col>
                </Row>);
      } else {
        return (<Row>
                  <Col md={12}>
                    <Panel header="Oops!">
                      It looks like this build does not exist!
                    </Panel>
                  </Col>
                </Row>);
      }
    }
    console.log("didn't render anything!");
    return null;
  }
}
BuildPage.propTypes = {
  editing: React.PropTypes.bool
};
BuildPage.contextTypes = {
  router: React.PropTypes.func
};