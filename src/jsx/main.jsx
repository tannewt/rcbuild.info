'use strict';
var request = require('superagent');
var _ = require('underscore');
var React = require('react');
var Cookies = require('js-cookie');
var CollapsibleMixin = require('react-bootstrap/lib/CollapsibleMixin');
var Grid = require('react-bootstrap/lib/Grid');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
var Table = require('react-bootstrap/lib/Table');
var Panel = require('react-bootstrap/lib/Panel');
var Navbar = require('react-bootstrap/lib/Navbar');
var CollapsibleNav = require('react-bootstrap/lib/CollapsibleNav');
var Nav = require('react-bootstrap/lib/Nav');
var NavItem = require('react-bootstrap/lib/NavItem');
var Jumbotron = require('react-bootstrap/lib/Jumbotron');
var Button = require('react-bootstrap/lib/Button');
var classNames = require('classnames');
require("babel-core/polyfill"); /* for Number.isInteger() */

/**
* Function that tracks a click on an outbound link in Google Analytics.
* This function takes a valid URL string as an argument, and uses that URL string
* as the event label.
*/
var trackOutboundLink = function(url) {
   ga('send', 'event', 'outbound', 'click', url, {'hitCallback':
     function () {
       document.location = url;
     }
   });
}

var parseCleanflightDump = function(dumpTxt) {
  var splitTxt = dumpTxt.split("\n");
  var setRegExp = new RegExp("set (\\w+) =\\s+(\\d+\\.\\d+|\\d+)");
  var config = {};
  for (var lineNum in splitTxt) {
    var result = setRegExp.exec(splitTxt[lineNum]);
    if (result) {
      config[result[1]] = Number(result[2]);
    }
  }
  return config;
}

var BuildSettings = React.createClass({
  getInitialState: function() {
    return {
      cleanflightSettings: {}
    };
  },
  componentDidMount: function() {
    request.get('/build/' + this.props.user + "/" + this.props.repo + "/cleanflight_cli_dump.txt")
           .end(_.bind(function(err, res){
             if (!this.isMounted()) return;
             if (res.ok) {
               this.setState({
                 cleanflightSettings: parseCleanflightDump(res.text)
               });
             }
           }, this));
  },
  render: function() {
    if (!this.state.cleanflightSettings) return <div></div>;
    var c = this.state.cleanflightSettings;
    var p_roll = c.pid_controller == 2 ? c.p_rollf : c.p_roll / 10;
    var i_roll = c.pid_controller == 2 ? c.i_rollf : c.i_roll / 1000;
    var d_roll = c.pid_controller == 2 ? c.d_rollf : c.d_roll;
    var p_pitch = c.pid_controller == 2 ? c.p_pitchf : c.p_pitch / 10.;
    var i_pitch = c.pid_controller == 2 ? c.i_pitchf : c.i_pitch / 1000.;
    var d_pitch = c.pid_controller == 2 ? c.d_pitchf : c.d_pitch;
    var p_yaw = c.pid_controller == 2 ? c.p_yawf : c.p_yaw / 10.;
    var i_yaw = c.pid_controller == 2 ? c.i_yawf : c.i_yaw / 1000.;
    var d_yaw = c.pid_controller == 2 ? c.d_yawf : c.d_yaw;
    var corePID =
      <div fill>
      <Table condensed striped>
        <thead>
          <tr><th></th><th>Proportional</th><th>Integral</th><th>Derivative</th></tr>
        </thead>
        <tbody>
          <tr><td>Roll</td><td>{p_roll}</td><td>{i_roll}</td><td>{d_roll}</td></tr>
          <tr><td>Pitch</td><td>{p_pitch}</td><td>{i_pitch}</td><td>{d_pitch}</td></tr>
          <tr><td>Yaw</td><td>{p_yaw}</td><td>{i_yaw}</td><td>{d_yaw}</td></tr>
        </tbody>
      </Table>
      <Table condensed striped>
        <tbody>
          <tr><td>PID Controller</td><td>{c.pid_controller}</td></tr>
          <tr><td>looptime</td><td>{c.looptime}</td></tr>
        </tbody>
      </Table>
      </div>;
    var rates =
      <Table condensed striped>
        <tbody>
          <tr><td>Roll</td><td>{c.roll_rate}</td></tr>
          <tr><td>Pitch</td><td>{c.pitch_rate}</td></tr>
          <tr><td>Yaw</td><td>{c.yaw_rate}</td></tr>
          <tr><td>TPA</td><td>{c.tpa_rate}</td></tr>
          <tr><td>TPA Breakpoint</td><td>{c.tpa_breakpoint}</td></tr>
        </tbody>
      </Table>;
    var filter =
      <Table condensed striped>
        <tbody>
          <tr><td>gyro_lpf</td><td>{c.gyro_lpf}</td></tr>
          <tr><td>dterm_cut_hz</td><td>{c.dterm_cut_hz}</td></tr>
          <tr><td>pterm_cut_hz</td><td>{c.pterm_cut_hz}</td></tr>
          <tr><td>gyro_cut_hz</td><td>{c.gyro_cut_hz}</td></tr>
        </tbody>
      </Table>;
    return (<div className="pids">
              <div><h3>Core</h3>{corePID}</div>
              <div><h3>Rates</h3>{rates}</div>
              <div><h3>Filter</h3>{filter}</div>
            </div>);
  }
});

var getSite = function(url) {
  var parser = document.createElement('a');
  parser.href = url;
  return parser.hostname.replace("www.", "");
};
var PartDetails = React.createClass({
  render: function() {
    if (!this.props.partInfo || Object.keys(this.props.partInfo).length == 0) return <div>Unknown part.</div>;
    var buttons = [];
    for (var urlClass in this.props.partInfo.urls) {
      for (var i = 0; i < this.props.partInfo.urls[urlClass].length; i++) {
        var url = this.props.partInfo.urls[urlClass][i];
        var site = getSite(url);
        var onClick = function() {
          trackOutboundLink(url);
          event.preventDefault ? event.preventDefault() : event.returnValue = !1;
        };
        buttons.push((<li key={url}><a href={url} className={urlClass} onClick={onClick}>{site}</a></li>));
      }
    }
    return (<Row className="row-eq-height links"><Col className="category" xs={4}></Col><Col xs={8}><ul>{buttons}</ul></Col></Row>);
  }
});

var Part = React.createClass({
  getInitialState: function() {
    return {
      partInfo: {},
      unknown: false
    };
  },

  mixins: [CollapsibleMixin],

  getCollapsibleDOMNode: function(){
    return React.findDOMNode(this.refs.panel);
  },

  getCollapsibleDimensionValue: function(){
    return React.findDOMNode(this.refs.panel).scrollHeight;
  },

  onHandleToggle: function(e) {
    ga('send', 'event', 'part', 'toggle', this.props.id);
    e.preventDefault();
    this.setState({expanded:!this.state.expanded});
  },

  componentDidMount: function() {
    request.get('/part/' + this.props.id + ".json")
           .end(_.bind(function(err, res){
             if (!this.isMounted()) return;
             if (res.ok) {
              this.setState({
                partInfo: JSON.parse(res.text)
              });
             } else {
              this.setState({
                unknown: true
              });
             }
           }, this));
  },
  render: function() {
    var styles = this.getCollapsibleClassSet();
    var unknown = "";
    if (this.state.unknown) {
      unknown = (<a href="https://github.com/tannewt/rcbuild.info-part-skeleton" title="This part is unknown. Click for more information on how to add it." target="_blank" className="unknown">?</a>);
    }
    var partInfo = (<Col className="name" xs={8}>{this.props.id}{unknown}</Col>);
    if (this.state.partInfo.name) {
      partInfo = (<Col className="name" xs={8}>{this.state.partInfo.manufacturer} {this.state.partInfo.name}</Col>);
    }
    return (<div className="part"><Row onClick={this.onHandleToggle}><Col className="category" xs={4}>{this.props.model.name}</Col>{partInfo}</Row><div ref='panel' className={classNames(styles)}><PartDetails partInfo={this.state.partInfo}/></div></div>);
  }
});

var sortManufacturerIDs = function(a, b) {
  var aUnknown = a.startsWith("UnknownManufacturer");
  var bUnknown = b.startsWith("UnknownManufacturer");
  if ((aUnknown && bUnknown) || (!aUnknown && !bUnknown)) {
    if (a == b) {
      return 0;
    } else if (a < b) {
      return -1;
    } else {
      return 1;
    }
  } else if (aUnknown) {
    return 1;
  } else if (bUnknown) {
    return -1;
  }
}

var BuildCard = React.createClass({
  render: function() {
    var header = <h1><a href={ "/build/" + this.props.id}>{this.props.id}</a></h1>;
    return <Panel header={header} className="build-card">
        <Row className="row-eq-height" fill>
          <Col xs={8}>
            <div className='embed-responsive embed-responsive-16by9'><iframe className='embed-responsive-item' src={ "https://www.youtube.com/embed/" + this.props.flightInfo.hd.url + "?controls=0&rel=0&showinfo=0&start=" + this.props.flightInfo.hd.arm_time}/></div>
          </Col>
          <Col xs={4}>
            <div className='embed-responsive embed-responsive-16by9'><iframe className='embed-responsive-item' src={ "https://www.youtube.com/embed/" + this.props.flightInfo.flight.url + "?controls=0&rel=0&showinfo=0&start=" + this.props.flightInfo.flight.arm_time}/></div>
            <div className='blackbox'></div>
          </Col>
        </Row>
      </Panel>;
  }
});

var BuildList = React.createClass({
  render: function() {
    var buildIds = ["tannewt/Blackout",
                    "kvanvranken/QAV250"];
    var flightInfo = {"tannewt/Blackout":
                       {"hd": {"url":"-t-pb3jMmbk",
                               "arm_time": 28.47},
                        "flight": {"url": "DsrK2Y6CjhY",
                                   "arm_time": 0},
                        "blackbox": {"url": "https://www.dropbox.com/s/nnh9tau26rmr2og/LOG00344.TXT?dl=0"}},
                      "kvanvranken/QAV250": {"hd": {"url":"vRNahTMs5zg",
                              "arm_time": 0},
                       "flight": {"url": "JMKLkgrkkoE",
                                  "arm_time": 0},
                       "blackbox": {"url": ""}}};
    var builds = [];
    for (var i in buildIds) {
      builds.push((<BuildCard id={ buildIds[i] } key={ buildIds[i]} flightInfo={ flightInfo[buildIds[i]]}/>))
    }
    return <div>{builds}</div>;
  }
});

var PartList = React.createClass({
  render: function() {
    var parts = [];
    if (this.props.parts) {
      console.log(this.props.parts);
      var manufacturerIDs = Object.keys(this.props.parts);
      manufacturerIDs.sort(sortManufacturerIDs);
      for (var i in manufacturerIDs) {
        var manufacturerID = manufacturerIDs[i];
        var partIDs = Object.keys(this.props.parts[manufacturerID]);
        partIDs.sort();
        for (var i in partIDs) {
          var partID = partIDs[i];
          var part = this.props.parts[manufacturerID][partID];
          var name;
          if (!manufacturerID.startsWith("UnknownManufacturer")) {
            name = part.manufacturer + " " + part.name
          } else {
            name = part.name;
          }
          parts.push(
            (
              <tr key={manufacturerID + "/" + partID}>
                <td>{manufacturerID}/{partID}</td>
                <td>{ name }</td>
              </tr>
            ));
        }
      }
    }
    return <Table>
             <thead>
               <tr>
                 <th>ID</th><th>Name</th>
               </tr>
             </thead>
             <tbody>
               {parts}
             </tbody>
           </Table>;
  }
});

var SupportedParts = React.createClass({
  getInitialState: function() {
    return {
      partCategories: null,
      parts: null
    };
  },

  componentDidMount: function() {
    request.get('/partIndex/by/category.json')
           .end(_.bind(function(err, res){
             if (res.ok && this.isMounted()) {
                this.setState({
                  parts: JSON.parse(res.text)
                });
              }
           }, this));
    request.get('/partCategories.json')
           .end(_.bind(function(err, res){
             if (res.ok && this.isMounted()) {
                this.setState({
                  partCategories: JSON.parse(res.text)
                });
            }
           }, this));
  },
  render: function() {
    if (!this.state.parts || !this.state.partCategories) {
      return <div/>;
    }
    var categories = [];
    var partCategories = Object.keys(this.state.partCategories["categories"]);
    partCategories.sort(_.bind(function(a, b) { return this.state.partCategories["categories"][a]["order"] - this.state.partCategories["categories"][b]["order"]; }, this));
    for (var i in partCategories) {
      var category = partCategories[i];
      categories.push(
        (<Panel header={this.state.partCategories["categories"][category]["name"] + " (" + category + ")"} key={category}>
           <PartList parts={this.state.parts[category]} fill/>
         </Panel>));
    }
    return <div>{ categories }</div>;
  }
});

var AllParts = React.createClass({
  getInitialState: function() {
    return {
      parts: null
    };
  },

  componentDidMount: function() {
    request.get('/partIndex/by/id.json')
           .end(_.bind(function(err, res){
             if (res.ok && this.isMounted()) {
                this.setState({
                  parts: JSON.parse(res.text)
                });
            }
           }, this));
  },
  render: function() {
    if (this.state.parts) {
      return <PartList parts={this.state.parts}/>
    }
    return <div/>;
  }
});

var Build = React.createClass({
  getInitialState: function() {
    return {
      buildModel: {},
      buildInfo: {}
    };
  },

  componentDidMount: function() {
    request.get('/build/' + this.props.user + "/" + this.props.repo + ".json")
           .end(_.bind(function(err, res){
             if (res.ok && this.isMounted()) {
                this.setState({
                  buildInfo: JSON.parse(res.text)
                });
              }
           }, this));
    request.get('/partCategories.json')
           .end(_.bind(function(err, res){
             if (res.ok && this.isMounted()) {
                this.setState({
                  partCategories: JSON.parse(res.text)
                });
            }
           }, this));
  },
  render: function() {
    var parts = [];
    if (this.state.partCategories && this.state.buildInfo) {
      var partCategories = Object.keys(this.state.buildInfo["config"]);
      partCategories.sort(_.bind(function(a, b) { return this.state.partCategories["categories"][a]["order"] - this.state.partCategories["categories"][b]["order"]; }, this));
      for (var i in partCategories) {
        var category = partCategories[i];
          parts.push((<Part model={this.state.partCategories["categories"][category]} key={this.state.buildInfo.config[category]} id={this.state.buildInfo.config[category]}/>));
        }
    }
    return (<div>{parts}</div>);
  }
});

var urlparts = window.location.pathname.split("/");
var base = urlparts[1];
var content;
var github;
if (base == "build") {
  var user = urlparts[2];
  var repo = urlparts[3];
  content = <Row>
              <Col md={6}>
                <Panel header="Build">
                  <Build user={user} repo={repo} fill/>
                </Panel>
              </Col>
              <Col md={6}>
                <Panel header="PIDs">
                  <BuildSettings user={user} repo={repo} fill/>
                </Panel>
              </Col>
            </Row>;
  github = 'https://github.com/' + user + '/' + repo;
} else if (base == "parts") {
  var classification = urlparts[2];
  if (classification == "supported") {
    content = <SupportedParts/>;
  } else if (classification == "all") {
    content = <AllParts/>;
  }
  github = 'https://github.com/tannewt/rcbuild.info-parts';
} else if (base == "builds") {
  content = <BuildList/>;
  github = 'https://github.com/tannewt/rcbuild.info';
} else if (base === "") {
  var url = "https://github.com/tannewt/rcbuild.info-build-skeleton/blob/master/README.md";
  var onClick = function() {
    trackOutboundLink(url);
    event.preventDefault ? event.preventDefault() : event.returnValue = !1;
  };
  content =
          <Jumbotron>
            <h1>Welcome!</h1>
            <p>Find a build and PIDs to make the best flying multirotor you've ever had. Or, share a build and PIDs you already have to get feedback easily.</p>
            <p><Button bsStyle='primary' href="/builds">Find Build</Button> <Button bsStyle='primary' onClick={onClick} href={url}>Share Build</Button></p>
          </Jumbotron>
  github = 'https://github.com/tannewt/rcbuild.info';
}
var logo = <a href="/"><img src="/static/logo.svg"/></a>;
var login = <NavItem eventKey={2} href={'/login?next=' + window.location.href}>Login with GitHub</NavItem>;
if (Cookies.get("u")) {
  login = <NavItem eventKey={2} href={'/logout?next=' + window.location.href}>Logout</NavItem>;
}

React.render(
  <div id="appContainer">
    <Navbar brand={logo} toggleNavKey={0}>
      <CollapsibleNav eventKey={0}> {/* This is the eventKey referenced */}
        <Nav navbar right>
          <NavItem eventKey={1} href={github}>View on GitHub</NavItem>
          {login}
        </Nav>
      </CollapsibleNav>
    </Navbar>
    <Grid>
      <Row>
        <Col xs={12}>
          { content }
        </Col>
      </Row>
      <hr/>
      <Row>
        <Col xs={12}>
          <div className="footer">RCBuild.Info is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to amazon.com.</div>
        </Col>
      </Row>
    </Grid>
  </div>,
  document.body
);
