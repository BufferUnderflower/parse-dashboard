/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import hasAncestor  from 'lib/hasAncestor';
import Button       from 'components/Button/Button.react';
import Icon         from 'components/Icon/Icon.react';
import { Map }      from 'immutable';
import Pill         from 'components/Pill/Pill.react';
import Popover      from 'components/Popover/Popover.react';
import Position     from 'lib/Position';
import React        from 'react';
import styles       from 'components/ProtectedFieldsDialog/ProtectedFieldsDialog.scss';
import {
  unselectable,
  verticalCenter
}                   from 'stylesheets/base.scss';
import MultiSelect  from 'components/MultiSelect/MultiSelect.react'
import MultiSelectOption 
                    from 'components/MultiSelect/MultiSelectOption.react'

let origin = new Position(0, 0);

export default class PermissionsDialog extends React.Component {
  constructor({
    protectedFields,
    columns
  }) {
    super();

    let keys =  Object.keys(protectedFields || {});
  
    this.state = {
      transitioning: false,
      columns: columns,
      protectedFields: new Map(protectedFields|| {}), // protected fields map
      keys, // fields row order
      newEntry: '',
      entryError: null,
      newKeys: [], // Order for new entries
    };
  }


  handleKeyDown(e) {
    if (e.keyCode === 13) {
      this.checkEntry();
    }
  }

  checkEntry() {
    if (this.state.newEntry === '') {
      return;
    }
    if (this.props.validateEntry) {
      this.props.validateEntry(this.state.newEntry).then((type) => {
        if (type.user || type.role) {
          let id = type.user ? type.user.id : 'role:' + type.role.getName();
          if (this.state.keys.indexOf(id) > -1 || this.state.newKeys.indexOf(id) > -1) {
            return this.setState({
              entryError: 'You already have a row for this object'
            })
          }

          let nextFields = this.state.protectedFields;
          nextFields.set(id,[]);
     
          let nextKeys = this.state.newKeys.concat([id]);
          return this.setState({
            protectedFields: nextFields,
            newKeys: nextKeys,
            newEntry: '',
            entryError: null,
          });
        }
        if (type.pointer) {
          let nextFields = this.state.protectedFields.set(type.pointer, []);
          let nextKeys = this.state.newKeys.concat('userField:' + type.pointer);

          this.setState({
            pointerPerms: nextFields,
            newKeys: nextKeys,
            newEntry: '',
            entryError: null,
          });
        }

        if(type.public){
          let nextFields = this.state.protectedFields.set(type.public, [])
          let nextKeys = this.state.newKeys.concat('Public: ' + type.public);

          return this.setState({
            protectedFields: nextFields,
            newKeys: nextKeys,
            newEntry: '',
            entryError: null,
          });

        }
      }, () => {
        if (this.props.advanced && this.props.enablePointerPermissions) {
          this.setState({
            entryError: 'Role, User or pointer field not found. Enter a valid Role name, Username, User ID or User pointer field name.'
          });
        } else {
          this.setState({
            entryError: 'Role or User not found. Enter a valid Role name, Username, or User ID.'
          });
        }
      })
    }
  }

  deleteRow(key) {
    // remove from proectedFields
    let protectedFields = this.state.protectedFields.delete(key);

    // also remove from local state
    let keys = this.state.keys.filter(k => k !== key);
    let newKeys = this.state.newKeys.filter(k => k !== key);

    return this.setState({
      protectedFields,
      newKeys,
      keys
    });
}

  outputPerms() {
    let output = this.state.perms;

    output.protectedFields = this.state.protectedFields.toObject()

    return output;
  }


  onChange(key,newValue){
    this.setState((state)=>{
      let protectedFields = state.protectedFields;
      protectedFields = protectedFields.set(key,newValue);
      return { protectedFields }
    })
  }

   /** 
   * @param {String} key - entity (Public, User, Role, field-pointer)
   * @param {Object} schema - object with fields of collection: { [fieldName]: { type: String, targetClass?: String }}
   * @param {String[]} selected - fields that are set for entity
   * 
   * Renders Dropdown allowing to pick multiple fields for an entity (row).
   */
  renderSelector(key, schema, selected){

    console.log(schema)
    let options = [];
    let values = selected || [];

    let entries = Object.entries(schema);
    for (let [field, {type}] of entries) {
      options.push(
        <MultiSelectOption
          key={`col-${field}`}
          value={field}
          dense={true}
        >
            {field}
            <span className={styles.pillType}>
              <Pill value={type}/>
            </span>
        </MultiSelectOption>
      );
    }

    return (
      <div className={styles.second, styles.multiselect}>
        <MultiSelect
          fixed={false}
          dense={true}
          chips={true}
          onChange= {s=>{
            this.onChange(key,s);
          }}
          value={values}
          placeHolder="Add some fields"
        >
          {options}
        </MultiSelect>
      </div>
    );
  }

  renderRow(key, forcePointer) {
    let pointer = !!forcePointer;
    let label = <span>{key}</span>;
    if (key.startsWith('role:')) {
      label = <span>{key.substr(5)} (Role)</span>;
    } else if (key.startsWith('userField:')) {
      pointer = true;
      key = key.substr(10);
    }
    if (pointer) {
      label = <span>{key} <span className={styles.pillHolder}><Pill value='<_User>' /></span></span>;
    }
    let content = null;
    if (!this.state.transitioning) {
      if (pointer) {
        content = this.renderSelector(
          key,
          this.state.columns,
          this.state.protectedFields.get(key)
        );
      } else {
        content = this.renderSelector(key, this.state.columns, this.state.protectedFields.get(key),
        );
      }
    }
    let trash = null;
    if (!this.state.transitioning) {
      trash = (
        <div className={styles.delete}>
          <a href='javascript:;' role='button' onClick={this.deleteRow.bind(this, key, pointer)}>
            <Icon name='trash-solid' width={20} height={20} />
          </a>
        </div>
      );
    }
    return (
      <div key={key} className={styles.row}>
        <div className={styles.label}>{label}</div>
        {content}
        {trash}
      </div>
    );
  }


  close(e){
    if (!hasAncestor(e.target, this.node)) {
      //In the case where the user clicks on the node, toggle() will handle closing the dropdown.
      this.setState({open: false});
   }
  }

  render() {
    let classes = [styles.dialog, unselectable];
    
    classes.push(styles.clp);   
    classes.push(styles.advanced);

    let placeholderText = placeholderText = 'Role, User, or pointer-field\u2026';
    
    return (
      <Popover fadeIn={true} fixed={true} position={origin} modal={true} color='rgba(17,13,17,0.8)'
      onExternalClick={this.close.bind(this)}
      >
        <div className={classes.join(' ')}>
          <div className={styles.header}>
            {this.props.title}
          </div>
          <div className={styles.tableWrap}>
            <div className={styles.table}>

            <div className={[styles.overlay, styles.second].join(' ')} />

              {this.state.keys.map((key) => 
                this.renderRow(key, this.state.columns[key].type === 'userField' )
              )}
   
              {this.state.newKeys.map((key) => this.renderRow(key))}
              <div className={styles.row}>
                <input
                  className={[styles.entry, this.state.entryError ? styles.error : undefined].join(' ')}
                  value={this.state.newEntry}
                  onChange={(e) => this.setState({ newEntry: e.target.value })}
                  onBlur={this.checkEntry.bind(this)}
                  onKeyDown={this.handleKeyDown.bind(this)}
                  placeholder={placeholderText} />
              </div>
            </div>
          </div>
          <div className={styles.footer}>
            <div className={styles.actions}>
              <Button
                value='Cancel'
                onClick={this.props.onCancel} />
              <Button
                primary={true}
                value={this.props.confirmText}
                onClick={() => this.props.onConfirm(this.outputPerms())} />
            </div>
            <div className={[styles.details, verticalCenter].join(' ')}>
              {this.props.details}
            </div>
          </div>
        </div>
      </Popover>
    );
  }
}
