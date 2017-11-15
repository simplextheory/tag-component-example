import { TreeTableModule, TreeNode, SharedModule } from "primeng/primeng";
import { PopoverController } from "ionic-angular";

import { NG_VALUE_ACCESSOR, ControlValueAccessor } from "@angular/forms";
import {
  Component,
  Input,
  ChangeDetectorRef,
  forwardRef
} from "@angular/core";

import { Observable, BehaviorSubject } from "rxjs";

import * as style from "./tags.component.scss";
import { SearchComponent } from "./search.component";
@Component({
  selector: "evo-tags",
  templateUrl: "tags.component.html",
  styles: [style],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagsComponent),
      multi: true
    }
  ]
})
export class TagsComponent implements ControlValueAccessor {
  @Input() config: any = { placeholder: "Enter string..." };

  private selectionObservable: BehaviorSubject<any[]> = new BehaviorSubject([]);
  private innerValue: any = [];
  private selectedNodes: any = [];

  // BEGIN: value accessor ---------
  private onTouchedCallback = () => {};
  private onChangeCallback = v => {};

  blur() {
    this.onTouchedCallback();
  }

  writeValue(nodes: any) {
    if (!Array.isArray(nodes)) return;
    this.selectedNodes = nodes;
    this.selectionObservable.next(nodes);
  }

  registerOnChange(fn: any) {
    this.onChangeCallback = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouchedCallback = fn;
  }
  // END: value accessor ---------

  remove(node) {
    this.selectedNodes = this.selectedNodes.filter(n => {
      return node._id != n._id;
    });
    this.selectionObservable.next(this.selectedNodes);
    this.onChangeCallback(this.selectedNodes);
  }

  add(node) {
    let exists = false;
    this.selectedNodes.forEach(n => {
      if (n._id == node._id) exists = true;
    });
    if (!exists) {
      this.selectedNodes.push(node);
      this.selectionObservable.next(this.selectedNodes);
      this.onChangeCallback(this.selectedNodes);
    }
  }

  constructor(
    private cd: ChangeDetectorRef,
    public popoverCtrl: PopoverController
  ) {}

  presentPopover(myEvent) {
    let self = this;
    let popover = this.popoverCtrl.create(SearchComponent, {
      rootNode: this.config.rootNode || "iecu9uaP6u",
      filter: this.config.filter,
      callback: {
        add: node => {
          self.add(node);
        },
        remove: node => {
          self.remove(node);
        }
      },
      selectionObservable: this.selectionObservable
    });
    popover.present({ ev: myEvent });
  }
}
