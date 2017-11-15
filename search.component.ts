import { Component, ViewChild, AfterViewInit, Input } from "@angular/core";

import { NavParams, ViewController, Searchbar } from "ionic-angular";
import { MeteorObservable } from "meteor-rxjs";
import { TreeTableModule, TreeNode, SharedModule } from "primeng/primeng";
import * as _ from "underscore";

import { Nodes } from "api/collections";
import { Node } from "api/models";
import * as style from "./search.component.scss";

@Component({
  selector: "evo-search-popover",
  styles: [style],
  templateUrl: "./search.component.html"
})
export class SearchComponent implements AfterViewInit {
  @ViewChild("searchbar") searchBar: Searchbar;
  rootNode: string;
  filter: any;

  searchQuery: string = "";
  nodes: any = [];
  treeNodes: TreeNode[] = [];
  search: any;
  nodeSub: any;
  nodesSubs: any = [];
  fieldName: string = "name";
  headerName: string = "Name";
  metaKeySelection: boolean = false;
  callback: any;
  selectionObservable: any;
  selectedNodes: any;
  searchView: boolean = false;
  notFoundDelay: boolean = false;

  constructor(private viewCtrl: ViewController, private params: NavParams) {
    this.rootNode = this.params.get("rootNode") || "1";
    this.filter = this.params.get("filter");
    this.callback = this.params.get("callback");
    this.selectionObservable = this.params.get("selectionObservable");
  }

  ngAfterViewInit() {
    this.nodeSub = MeteorObservable.subscribe("nodes", {
      path: this.rootNode
    }).subscribe();
    this.selectionObservable &&
      this.selectionObservable.subscribe(nodes => {
        this.nodes = nodes;
        this.selectedNodes = this.getSelectedNodes(nodes);
      });
    this.lazyLoading(this.treeNodes, this.rootNode);
  }

  getSelectedNodes(nodes): TreeNode[] {
    let selectedNodes: TreeNode[] = [];
    nodes.forEach(n => {
      let treeNode = this.findTreeNode(n, this.treeNodes);
      if (treeNode) selectedNodes.push(treeNode);
    });
    return selectedNodes;
  }

  findTreeNode(node, tree): TreeNode {
    let selectedNode;
    tree &&
      tree.forEach(t => {
        if (t.data._id == node._id) selectedNode = t;
        else {
          let f = this.findTreeNode(node, t.children);
          if (f) selectedNode = f;
        }
      });
    return selectedNode;
  }

  ionViewDidLoad() {
    setTimeout(() => {
      this.searchBar.setFocus();
    }, 500);
  }

  getFilteredNodes(ev: any) {
    let val = ev.target.value && ev.target.value.trim();
    let minChars = 1;
    let timeout = 550;
    let timeouthandle1, timeouthandle2;

    if (val && val.length >= minChars) {
      this.searchView = true;
      let regex = new RegExp(val, "i");
      let query = { path: this.rootNode };
      this.addFilterToQuery(this.filter, query);
      query["name"] = regex;
      let options = { limit: 20 };
      clearTimeout(timeouthandle1);
      timeouthandle1 = setTimeout(() => {
        this.clearSubscriptions(this.nodesSubs);
        this.treeNodes = [];
        this.notFoundDelay = false;
        setTimeout(() => {
          this.notFoundDelay = true;
        }, 100);
        let sub = Nodes.find(query, options).subscribe(nodes => {
          clearTimeout(timeouthandle2);
          timeouthandle2 = setTimeout(() => {
            this.treeNodes = this.generateNodeTree(nodes, this.rootNode);
            this.selectedNodes = this.getSelectedNodes(this.nodes);
          }, 0);
        });
        this.nodesSubs.push(sub);
      }, timeout);
    } else {
      this.searchView = false;
      this.lazyLoading(this.treeNodes, this.rootNode);
    }
  }

  addFilterToQuery(filter, query) {
    if (filter) {
      Object.keys(filter).forEach(k => {
        query[k] = filter[k];
      });
    }
  }

  lazyLoading(targetNodes: any[], parentId) {
    let query = { pid: parentId };
    this.addFilterToQuery(this.filter, query);
    let sub = Nodes.find(query).subscribe(nodes => {
      targetNodes.splice(0, targetNodes.length);
      nodes.forEach(n => {
        let newNode = { data: n, leaf: true };
        targetNodes.push(newNode);
        this.checkLeafState(newNode);
      });
      this.selectedNodes = this.getSelectedNodes(this.nodes);
    });
    this.nodesSubs.push(sub);
  }

  checkLeafState(node) {
    let query = { pid: node.data._id };
    this.addFilterToQuery(this.filter, query);
    let child = Nodes.findOne(query);
    if (child) node.leaf = false;
    else node.leaf = true;
  }

  clearSubscriptions(subscriptions) {
    if (subscriptions && subscriptions.length) {
      while (subscriptions.length > 0) {
        let sub = subscriptions.pop();
        if (sub) sub.unsubscribe();
      }
    }
  }

  unselectNodes(event) {
    if (event.node && event.node.data) {
      this.callback && this.callback.remove(event.node.data);
    }
  }

  selectNodes(event) {
    if (event.node && event.node.data) {
      this.callback && this.callback.add(event.node.data);
    }
  }

  loadChildren(event) {
    if (event.node && event.node.data && !this.searchView) {
      event.node.children = [];
      this.lazyLoading(event.node.children, event.node.data._id);
    }
  }

  generateNodeTree(nodes, root): TreeNode[] {
    let nodesTree: TreeNode[] = [];
    let children: any = {};
    nodes = nodes
      .filter(n => {
        return n.path.indexOf(root) > -1;
      })
      .sort((a, b) => {
        let diff = a.path.length - b.path.length;
        return diff !== 0 ? diff > 0 : a.name > b.name;
      });
    nodes.forEach(n => {
      let nextPos = n.path.indexOf(root) - 1;
      if (nextPos == -1) {
        return nodesTree.push({
          data: { name: n.name, _id: n._id, icon: n.icon },
          expanded: true
        });
      } else {
        let branchExists = false;
        let nextId = n.path[nextPos];
        nodesTree.forEach(nt => {
          if (nt.data._id == nextId) {
            if (!children[nextId]) children[nextId] = [];
            children[nextId].push(n);
            branchExists = true;
          }
        });
        if (!branchExists) {
          let next = Nodes.findOne(nextId);
          if (next) {
            let newBranch: TreeNode = {
              data: { name: next.name, _id: next._id, icon: next.icon },
              expanded: true,
              selectable: false
            };
            if (!children[next._id]) children[next._id] = [];
            children[next._id].push(n);
            nodesTree.push(newBranch);
          }
        }
      }
    });
    return nodesTree.map(nt => {
      let ntid = nt.data._id;
      if (children[ntid])
        nt.children = this.generateNodeTree(children[ntid], ntid);
      return nt;
    });
  }

  setSelected(selectedNodes) {
    this.viewCtrl.dismiss(selectedNodes);
  }
}
