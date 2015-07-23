import React from "react";

import Button from "react-bootstrap/lib/Button";
import Input from "react-bootstrap/lib/Input";
import Panel from "react-bootstrap/lib/Panel";

export default class CreateBuildPage extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    window.location.assign("/build/" + this.props.loggedInUser + "/" + this.refs.input.getValue());
  }

  render() {
    var content;
    if (this.props.loggedInUser) {
      let createButton = <Button bsStyle="primary" onClick={this.onClick}>Create</Button>;
      content = <form><Input buttonAfter={createButton} label="Name your build" placeholder="Build name" ref="input" type="text"/></form>;
    } else {
      content = <div>Oops, you need to be logged into GitHub in order to create a new build. Why? RCBuild.Info uses GitHub to version your data so you can always go back to old settings.<hr/><Button bsStyle="primary" href={"/login?next=" + window.location.href}>Login with GitHub</Button></div>;
    }
    return <Panel title="Create build" xs={12}>{content}</Panel>;
  }
}
CreateBuildPage.propTypes = {
  loggedInUser: React.PropTypes.string
};
