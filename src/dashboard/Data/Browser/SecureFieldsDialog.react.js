/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import Parse from "parse";
import React from "react";
import styles from "dashboard/Data/Browser/Browser.scss";
import ProtectedFieldsDialog from "components/ProtectedFieldsDialog/ProtectedFieldsDialog.react";

import ParseApp from "lib/ParseApp";
import PropTypes from "prop-types";

function validateEntry(pointers, text, parseServerSupportsPointerPermissions) {
  if (parseServerSupportsPointerPermissions) {
    if (pointers.indexOf(text) > -1) {
      return Promise.resolve({ pointer: text });
    }
  }

  let userQuery;
  let roleQuery;

  // allow explicitly define whether it is a role or user
  // (e.g there might be both role 'admin' and user 'admin')
  // in such case you can type role:admin to query only roles
  if (text === "*" || text.toLowerCase() === "public") {
    return Promise.resolve({ public: "*" });
  }
  if (text.startsWith("user:")) {
    // no need to query roles
    roleQuery = {
      find: () => Promise.resolve([])
    };

    let user = text.substring(5);
    userQuery = new Parse.Query.or(
      new Parse.Query(Parse.User).equalTo("username", user),
      new Parse.Query(Parse.User).equalTo("objectId", user)
    );
  } else if (text.startsWith("role:")) {
    // no need to query users
    userQuery = {
      find: () => Promise.resolve([])
    };
    let role = text.substring(5);
    roleQuery = new Parse.Query.or(
      new Parse.Query(Parse.Role).equalTo("name", role),
      new Parse.Query(Parse.Role).equalTo("objectId", role)
    );
  } else {
    // query both
    userQuery = Parse.Query.or(
      new Parse.Query(Parse.User).equalTo("username", text),
      new Parse.Query(Parse.User).equalTo("objectId", text)
    );

    roleQuery = Parse.Query.or(
      new Parse.Query(Parse.Role).equalTo("name", text),
      new Parse.Query(Parse.Role).equalTo("objectId", text)
    );
  }

  return Promise.all([
    userQuery.find({ useMasterKey: true }),
    roleQuery.find({ useMasterKey: true })
  ]).then(([user, role]) => {
    if (user.length > 0) {
      return { user: user[0] };
    } else if (role.length > 0) {
      return { role: role[0] };
    } else {
      return Promise.reject();
    }
  });
}

export default class SecureFieldsDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = { open: false };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.perms !== this.props.perms) {
      this.setState();
    }
  }

  handleOpen() {
    if (!this.props.disabled) {
      this.setState({ open: true });
    }
  }

  render() {
    let dialog = null;
    let parseServerSupportsPointerPermissions = this.context.currentApp
      .serverInfo.features.schemas.editClassLevelPermissions;
    if (this.props.perms && this.state.open) {
      dialog = (
        <ProtectedFieldsDialog
          title="Edit Protected Fields"
          columns={this.props.columns}
          protectedFields={this.props.perms.protectedFields}
          enablePointerPermissions={parseServerSupportsPointerPermissions}
          advanced={true}
          confirmText="Save Fields"
          details={
            <a
              target="_blank"
              href="http://docs.parseplatform.org/ios/guide/#security"
            >
              Learn more about CLPs and app security
            </a>
          }
          validateEntry={entry =>
            validateEntry(
              this.props.userPointers,
              entry,
              parseServerSupportsPointerPermissions
            )
          }
          onCancel={() => {
            this.setState({ open: false });
          }}
          onConfirm={perms =>
            this.props
              .onChangeCLP(perms)
              .then(() => this.setState({ open: false }))
          }
        />
      );
    }
    let classes = [styles.toolbarButton];
    if (this.props.disabled) {
      classes.push(styles.toolbarButtonDisabled);
    }

    return dialog;
  }
}

SecureFieldsDialog.contextTypes = {
  currentApp: PropTypes.instanceOf(ParseApp)
};
